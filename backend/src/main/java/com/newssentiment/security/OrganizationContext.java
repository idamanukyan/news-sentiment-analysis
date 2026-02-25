package com.newssentiment.security;

/**
 * Thread-local storage for the current organization context.
 * Set by JwtAuthenticationFilter on each request, cleared after request completion.
 */
public class OrganizationContext {

    private static final ThreadLocal<Long> currentOrgId = new ThreadLocal<>();
    private static final ThreadLocal<String> currentOrgSlug = new ThreadLocal<>();
    private static final ThreadLocal<String> currentOrgName = new ThreadLocal<>();

    /**
     * Set the current organization context for this thread/request.
     */
    public static void setCurrentOrganization(Long orgId, String slug, String name) {
        currentOrgId.set(orgId);
        currentOrgSlug.set(slug);
        currentOrgName.set(name);
    }

    /**
     * Get the current organization ID. Throws if not set.
     */
    public static Long getCurrentOrganizationId() {
        Long orgId = currentOrgId.get();
        if (orgId == null) {
            throw new IllegalStateException("No organization context available. User may not be authenticated or doesn't belong to an organization.");
        }
        return orgId;
    }

    /**
     * Get the current organization ID, or null if not set.
     */
    public static Long getCurrentOrganizationIdOrNull() {
        return currentOrgId.get();
    }

    /**
     * Get the current organization slug.
     */
    public static String getCurrentOrganizationSlug() {
        return currentOrgSlug.get();
    }

    /**
     * Get the current organization name.
     */
    public static String getCurrentOrganizationName() {
        return currentOrgName.get();
    }

    /**
     * Check if organization context is set.
     */
    public static boolean isSet() {
        return currentOrgId.get() != null;
    }

    /**
     * Clear the organization context. Must be called after request completion.
     */
    public static void clear() {
        currentOrgId.remove();
        currentOrgSlug.remove();
        currentOrgName.remove();
    }
}
