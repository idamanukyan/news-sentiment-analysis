package com.newssentiment.controller;

import com.newssentiment.dto.UserDTO;
import com.newssentiment.service.UserManagementService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/team")
@RequiredArgsConstructor
public class TeamController {

    private final UserManagementService userManagementService;

    @GetMapping("/members")
    public ResponseEntity<List<UserDTO>> getTeamMembers() {
        return ResponseEntity.ok(userManagementService.getTeamMembers());
    }

    @GetMapping("/slots")
    public ResponseEntity<Map<String, Integer>> getRemainingSlots() {
        int remaining = userManagementService.getRemainingUserSlots();
        return ResponseEntity.ok(Map.of("remaining", remaining));
    }

    @PostMapping("/members")
    @PreAuthorize("hasRole('ORG_ADMIN')")
    public ResponseEntity<UserDTO> addTeamMember(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String password = body.get("password");
        String name = body.get("name");
        String role = body.getOrDefault("role", "ANALYST");

        if (email == null || password == null || name == null) {
            return ResponseEntity.badRequest().build();
        }

        try {
            UserDTO created = userManagementService.addTeamMember(email, password, name, role);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(null);
        }
    }

    @PutMapping("/members/{id}/role")
    @PreAuthorize("hasRole('ORG_ADMIN')")
    public ResponseEntity<UserDTO> updateMemberRole(
            @PathVariable Long id,
            @RequestBody Map<String, String> body
    ) {
        String role = body.get("role");
        if (role == null) {
            return ResponseEntity.badRequest().build();
        }
        try {
            return userManagementService.updateTeamMemberRole(id, role)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/members/{id}")
    @PreAuthorize("hasRole('ORG_ADMIN')")
    public ResponseEntity<Void> removeTeamMember(@PathVariable Long id) {
        try {
            if (userManagementService.removeTeamMember(id)) {
                return ResponseEntity.noContent().build();
            }
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
