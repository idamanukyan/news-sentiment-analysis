#!/usr/bin/env python3
"""
Telegram Authentication Script
Run this once to authenticate with Telegram and create a session file.
The session file will be reused for subsequent connections.
"""
import asyncio
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from telethon import TelegramClient

API_ID = os.environ.get('TELEGRAM_API_ID', '35122309')
API_HASH = os.environ.get('TELEGRAM_API_HASH', 'a16a1da2bb62d2a62cd5da4f2fcf9ee2')
SESSION_NAME = 'aiim_telegram'


async def main():
    print("=" * 50)
    print("AIIM Telegram Authentication")
    print("=" * 50)
    print()
    print(f"API ID: {API_ID}")
    print(f"Session: {SESSION_NAME}")
    print()

    client = TelegramClient(SESSION_NAME, int(API_ID), API_HASH)

    await client.start()

    me = await client.get_me()
    print()
    print("Successfully authenticated!")
    print(f"Logged in as: {me.first_name} (@{me.username})")
    print()
    print(f"Session saved to: {SESSION_NAME}.session")
    print("This session file will be used for future connections.")
    print()

    # Test fetching a channel
    print("Testing channel access...")
    try:
        # Try to access a public channel
        channel = await client.get_entity('telegram')
        print(f"Successfully accessed channel: {channel.title}")
    except Exception as e:
        print(f"Note: Could not access test channel: {e}")

    await client.disconnect()
    print()
    print("Authentication complete! You can now use the Telegram scraper.")


if __name__ == '__main__':
    asyncio.run(main())
