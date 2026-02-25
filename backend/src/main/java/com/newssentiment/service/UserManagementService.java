package com.newssentiment.service;

import com.newssentiment.dto.OrganizationCreateRequest;
import com.newssentiment.dto.OrganizationDTO;
import com.newssentiment.dto.UserCreateRequest;
import com.newssentiment.dto.UserDTO;
import com.newssentiment.model.Organization;
import com.newssentiment.model.User;
import com.newssentiment.repository.OrganizationRepository;
import com.newssentiment.repository.UserRepository;
import com.newssentiment.security.OrganizationContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserManagementService {

    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final PasswordEncoder passwordEncoder;

    // ============ SUPER_ADMIN: Organization Management ============

    @Transactional(readOnly = true)
    public List<OrganizationDTO> getAllOrganizations() {
        return organizationRepository.findAll().stream()
                .map(org -> OrganizationDTO.fromEntity(org,
                    (int) userRepository.countByOrganization_Id(org.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<OrganizationDTO> getOrganizationById(Long id) {
        return organizationRepository.findById(id)
                .map(org -> OrganizationDTO.fromEntity(org,
                    (int) userRepository.countByOrganization_Id(org.getId())));
    }

    @Transactional
    public OrganizationDTO createOrganization(OrganizationCreateRequest request) {
        if (organizationRepository.existsBySlug(request.slug())) {
            throw new IllegalArgumentException("Organization with this slug already exists");
        }
        if (organizationRepository.existsByName(request.name())) {
            throw new IllegalArgumentException("Organization with this name already exists");
        }

        Organization.SubscriptionTier tier = Organization.SubscriptionTier.FREE;
        if (request.tier() != null) {
            tier = Organization.SubscriptionTier.valueOf(request.tier().toUpperCase());
        }

        // Set max users based on tier
        int maxUsers = switch (tier) {
            case FREE -> 3;
            case STANDARD -> 10;
            case ENTERPRISE -> 1000;
        };

        Organization org = Organization.builder()
                .name(request.name())
                .slug(request.slug())
                .description(request.description())
                .tier(tier)
                .maxUsers(maxUsers)
                .build();

        Organization saved = organizationRepository.save(org);
        log.info("Created organization: {} (slug={})", saved.getName(), saved.getSlug());
        return OrganizationDTO.fromEntity(saved, 0);
    }

    @Transactional
    public Optional<OrganizationDTO> updateOrganization(Long id, OrganizationCreateRequest request) {
        return organizationRepository.findById(id)
                .map(org -> {
                    if (!org.getName().equals(request.name()) && organizationRepository.existsByName(request.name())) {
                        throw new IllegalArgumentException("Organization with this name already exists");
                    }
                    if (!org.getSlug().equals(request.slug()) && organizationRepository.existsBySlug(request.slug())) {
                        throw new IllegalArgumentException("Organization with this slug already exists");
                    }

                    org.setName(request.name());
                    org.setSlug(request.slug());
                    org.setDescription(request.description());

                    if (request.tier() != null) {
                        Organization.SubscriptionTier tier = Organization.SubscriptionTier.valueOf(request.tier().toUpperCase());
                        org.setTier(tier);
                        // Update max users based on tier
                        int maxUsers = switch (tier) {
                            case FREE -> 3;
                            case STANDARD -> 10;
                            case ENTERPRISE -> 1000;
                        };
                        org.setMaxUsers(maxUsers);
                    }

                    Organization saved = organizationRepository.save(org);
                    log.info("Updated organization: {} (id={})", saved.getName(), id);
                    return OrganizationDTO.fromEntity(saved,
                        (int) userRepository.countByOrganization_Id(saved.getId()));
                });
    }

    @Transactional
    public boolean deleteOrganization(Long id) {
        return organizationRepository.findById(id)
                .map(org -> {
                    // Check if org has users
                    long userCount = userRepository.countByOrganization_Id(id);
                    if (userCount > 0) {
                        throw new IllegalStateException("Cannot delete organization with active users");
                    }
                    organizationRepository.delete(org);
                    log.info("Deleted organization: {} (id={})", org.getName(), id);
                    return true;
                })
                .orElse(false);
    }

    @Transactional
    public Optional<OrganizationDTO> toggleOrganizationActive(Long id) {
        return organizationRepository.findById(id)
                .map(org -> {
                    org.setActive(!org.getActive());
                    Organization saved = organizationRepository.save(org);
                    log.info("Toggled organization {} active={}", saved.getName(), saved.getActive());
                    return OrganizationDTO.fromEntity(saved,
                        (int) userRepository.countByOrganization_Id(saved.getId()));
                });
    }

    // ============ SUPER_ADMIN: All Users Management ============

    @Transactional(readOnly = true)
    public List<UserDTO> getAllUsers() {
        return userRepository.findAll().stream()
                .map(UserDTO::fromEntity)
                .toList();
    }

    @Transactional
    public UserDTO createUserForOrganization(UserCreateRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("User with this email already exists");
        }

        Organization org = organizationRepository.findById(request.organizationId())
                .orElseThrow(() -> new IllegalArgumentException("Organization not found"));

        // Check user limit
        long currentUsers = userRepository.countByOrganization_Id(org.getId());
        if (currentUsers >= org.getMaxUsers()) {
            throw new IllegalStateException("Organization has reached maximum user limit (" + org.getMaxUsers() + ")");
        }

        User.Role role = User.Role.valueOf(request.role().toUpperCase());

        User user = User.builder()
                .email(request.email())
                .passwordHash(passwordEncoder.encode(request.password()))
                .name(request.name())
                .role(role)
                .organization(org)
                .build();

        User saved = userRepository.save(user);
        log.info("Created user: {} with role {} in org {}", saved.getEmail(), role, org.getName());
        return UserDTO.fromEntity(saved);
    }

    @Transactional
    public Optional<UserDTO> updateUserRole(Long userId, String newRole) {
        return userRepository.findById(userId)
                .map(user -> {
                    User.Role role = User.Role.valueOf(newRole.toUpperCase());
                    user.setRole(role);
                    User saved = userRepository.save(user);
                    log.info("Updated user {} role to {}", saved.getEmail(), role);
                    return UserDTO.fromEntity(saved);
                });
    }

    @Transactional
    public Optional<UserDTO> toggleUserEnabled(Long userId) {
        return userRepository.findById(userId)
                .map(user -> {
                    user.setEnabled(!user.getEnabled());
                    User saved = userRepository.save(user);
                    log.info("Toggled user {} enabled={}", saved.getEmail(), saved.getEnabled());
                    return UserDTO.fromEntity(saved);
                });
    }

    @Transactional
    public boolean deleteUser(Long userId) {
        return userRepository.findById(userId)
                .map(user -> {
                    userRepository.delete(user);
                    log.info("Deleted user: {} (id={})", user.getEmail(), userId);
                    return true;
                })
                .orElse(false);
    }

    // ============ ORG_ADMIN: Team Member Management ============

    @Transactional(readOnly = true)
    public List<UserDTO> getTeamMembers() {
        Long orgId = OrganizationContext.getCurrentOrganizationIdOrNull();
        if (orgId == null) {
            return List.of();
        }
        return userRepository.findByOrganization_IdOrderByCreatedAtDesc(orgId).stream()
                .map(UserDTO::fromEntity)
                .toList();
    }

    @Transactional
    public UserDTO addTeamMember(String email, String password, String name, String role) {
        Long orgId = OrganizationContext.getCurrentOrganizationIdOrNull();
        if (orgId == null) {
            throw new IllegalStateException("No organization context");
        }

        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("User with this email already exists");
        }

        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new IllegalStateException("Organization not found"));

        // Check user limit
        long currentUsers = userRepository.countByOrganization_Id(orgId);
        if (currentUsers >= org.getMaxUsers()) {
            throw new IllegalStateException("Your organization has reached the maximum user limit (" + org.getMaxUsers() + ")");
        }

        // ORG_ADMIN can only create ANALYST or VIEWER
        User.Role userRole = User.Role.valueOf(role.toUpperCase());
        if (userRole == User.Role.SUPER_ADMIN || userRole == User.Role.ORG_ADMIN) {
            throw new IllegalArgumentException("Cannot create users with admin roles");
        }

        User user = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(password))
                .name(name)
                .role(userRole)
                .organization(org)
                .build();

        User saved = userRepository.save(user);
        log.info("ORG_ADMIN added team member: {} with role {} in org {}", saved.getEmail(), userRole, org.getName());
        return UserDTO.fromEntity(saved);
    }

    @Transactional
    public Optional<UserDTO> updateTeamMemberRole(Long userId, String newRole) {
        Long orgId = OrganizationContext.getCurrentOrganizationIdOrNull();
        if (orgId == null) {
            return Optional.empty();
        }

        return userRepository.findByIdAndOrganization_Id(userId, orgId)
                .map(user -> {
                    // ORG_ADMIN can only set ANALYST or VIEWER
                    User.Role role = User.Role.valueOf(newRole.toUpperCase());
                    if (role == User.Role.SUPER_ADMIN || role == User.Role.ORG_ADMIN) {
                        throw new IllegalArgumentException("Cannot assign admin roles");
                    }
                    user.setRole(role);
                    User saved = userRepository.save(user);
                    log.info("ORG_ADMIN updated team member {} role to {}", saved.getEmail(), role);
                    return UserDTO.fromEntity(saved);
                });
    }

    @Transactional
    public boolean removeTeamMember(Long userId) {
        Long orgId = OrganizationContext.getCurrentOrganizationIdOrNull();
        if (orgId == null) {
            return false;
        }

        return userRepository.findByIdAndOrganization_Id(userId, orgId)
                .map(user -> {
                    // Cannot remove ORG_ADMIN
                    if (user.getRole() == User.Role.ORG_ADMIN || user.getRole() == User.Role.SUPER_ADMIN) {
                        throw new IllegalArgumentException("Cannot remove admin users");
                    }
                    userRepository.delete(user);
                    log.info("ORG_ADMIN removed team member: {} (id={})", user.getEmail(), userId);
                    return true;
                })
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public int getRemainingUserSlots() {
        Long orgId = OrganizationContext.getCurrentOrganizationIdOrNull();
        if (orgId == null) {
            return 0;
        }
        return organizationRepository.findById(orgId)
                .map(org -> org.getMaxUsers() - (int) userRepository.countByOrganization_Id(orgId))
                .orElse(0);
    }
}
