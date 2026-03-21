"""
Centralized LLM Client with Langfuse Observability

This module provides a unified interface for LLM calls with automatic
tracing and observability via Langfuse.
"""

import structlog
from typing import Optional
from functools import lru_cache

import anthropic
from langfuse import Langfuse
from langfuse.decorators import observe, langfuse_context

from .config import get_settings

logger = structlog.get_logger()
settings = get_settings()


@lru_cache()
def get_langfuse() -> Optional[Langfuse]:
    """
    Get Langfuse client instance (cached).
    Returns None if Langfuse is not configured.
    """
    if not settings.langfuse_enabled:
        logger.debug("langfuse_disabled")
        return None

    if not settings.langfuse_public_key or not settings.langfuse_secret_key:
        logger.warning("langfuse_not_configured",
                      message="Set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY to enable observability")
        return None

    try:
        client = Langfuse(
            public_key=settings.langfuse_public_key,
            secret_key=settings.langfuse_secret_key,
            host=settings.langfuse_host,
        )
        logger.info("langfuse_initialized", host=settings.langfuse_host)
        return client
    except Exception as e:
        logger.error("langfuse_init_error", error=str(e))
        return None


def get_anthropic_client() -> anthropic.Anthropic:
    """
    Get Anthropic client instance.
    """
    return anthropic.Anthropic(api_key=settings.anthropic_api_key)


@observe(name="anthropic_messages_create")
def create_message(
    model: str,
    messages: list,
    max_tokens: int,
    system: Optional[str] = None,
    trace_name: Optional[str] = None,
    trace_metadata: Optional[dict] = None,
) -> anthropic.types.Message:
    """
    Create a message using Anthropic API with Langfuse tracing.

    Args:
        model: The model to use (e.g., "claude-haiku-4-5-20251001")
        messages: List of message dicts with 'role' and 'content'
        max_tokens: Maximum tokens in response
        system: Optional system prompt
        trace_name: Optional name for the trace
        trace_metadata: Optional metadata to attach to the trace

    Returns:
        Anthropic Message response
    """
    client = get_anthropic_client()

    # Update trace context with metadata if provided
    if trace_metadata:
        langfuse_context.update_current_observation(
            metadata=trace_metadata
        )

    if trace_name:
        langfuse_context.update_current_trace(
            name=trace_name
        )

    # Build request kwargs
    kwargs = {
        "model": model,
        "max_tokens": max_tokens,
        "messages": messages,
    }
    if system:
        kwargs["system"] = system

    # Make the API call
    response = client.messages.create(**kwargs)

    # Log token usage to Langfuse
    langfuse_context.update_current_observation(
        usage={
            "input": response.usage.input_tokens,
            "output": response.usage.output_tokens,
        },
        model=model,
    )

    return response


def flush_langfuse():
    """
    Flush any pending Langfuse events.
    Call this before the application exits.
    """
    lf = get_langfuse()
    if lf:
        try:
            lf.flush()
            logger.debug("langfuse_flushed")
        except Exception as e:
            logger.error("langfuse_flush_error", error=str(e))


def shutdown_langfuse():
    """
    Shutdown Langfuse client gracefully.
    """
    lf = get_langfuse()
    if lf:
        try:
            lf.shutdown()
            logger.info("langfuse_shutdown")
        except Exception as e:
            logger.error("langfuse_shutdown_error", error=str(e))
