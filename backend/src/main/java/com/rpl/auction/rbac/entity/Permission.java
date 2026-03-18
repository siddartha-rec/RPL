package com.rpl.auction.rbac.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "permissions", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"module_id", "name"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Permission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "module_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Module module;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 255)
    private String description;

    public String toFlatString() {
        return module.getName() + ":" + name;
    }
}
