package com.rpl.auction.config;

import com.rpl.auction.league.entity.League;
import com.rpl.auction.league.repository.LeagueRepository;
import com.rpl.auction.player.entity.Player;
import com.rpl.auction.player.repository.PlayerRepository;
import com.rpl.auction.rbac.entity.Module;
import com.rpl.auction.rbac.entity.Permission;
import com.rpl.auction.rbac.entity.PermissionGroup;
import com.rpl.auction.rbac.repository.ModuleRepository;
import com.rpl.auction.rbac.repository.PermissionGroupRepository;
import com.rpl.auction.rbac.repository.PermissionRepository;
import com.rpl.auction.team.entity.Team;
import com.rpl.auction.team.repository.TeamRepository;
import com.rpl.auction.user.entity.User;
import com.rpl.auction.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements ApplicationRunner {
    private final ModuleRepository moduleRepository;
    private final PermissionRepository permissionRepository;
    private final PermissionGroupRepository permissionGroupRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final LeagueRepository leagueRepository;
    private final TeamRepository teamRepository;
    private final PlayerRepository playerRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (userRepository.existsByUsername("admin")) {
            log.info("Seed data already exists, skipping.");
            seedRplData();
            return;
        }
        log.info("Seeding initial data...");

        List<String> moduleNames = List.of("user", "rbac", "league", "team", "player",
                "retention", "auction", "dashboard", "report", "audit");
        Map<String, Module> modules = new LinkedHashMap<>();
        for (String name : moduleNames) {
            modules.put(name, moduleRepository.save(Module.builder().name(name).description(name + " management").build()));
        }

        List<String> crudOps = List.of("CREATE", "READ", "UPDATE", "DELETE");
        Map<String, List<String>> extraPermissions = Map.of(
                "user", List.of("MANAGE_GROUPS"),
                "rbac", List.of("MANAGE_PERMISSIONS"),
                "auction", List.of("BID", "START", "PAUSE", "RESUME", "COMPLETE")
        );

        Set<Permission> allPermissions = new HashSet<>();
        for (Map.Entry<String, Module> entry : modules.entrySet()) {
            for (String op : crudOps) {
                allPermissions.add(permissionRepository.save(Permission.builder()
                        .module(entry.getValue()).name(op).description(entry.getKey() + " " + op.toLowerCase()).build()));
            }
            for (String extra : extraPermissions.getOrDefault(entry.getKey(), List.of())) {
                allPermissions.add(permissionRepository.save(Permission.builder()
                        .module(entry.getValue()).name(extra).description(entry.getKey() + " " + extra.toLowerCase()).build()));
            }
        }

        PermissionGroup superAdmin = permissionGroupRepository.save(PermissionGroup.builder()
                .name("Super Admin").description("Full platform access").permissions(allPermissions).build());

        Set<Permission> leagueAdminPerms = new HashSet<>();
        for (Permission p : allPermissions) {
            if (!p.getModule().getName().equals("rbac") && !p.getModule().getName().equals("audit"))
                leagueAdminPerms.add(p);
        }
        permissionGroupRepository.save(PermissionGroup.builder()
                .name("League Admin").description("League-level administration").permissions(leagueAdminPerms).build());

        Set<Permission> teamOwnerPerms = new HashSet<>();
        permissionRepository.findByModuleNameAndName("team", "READ").ifPresent(teamOwnerPerms::add);
        permissionRepository.findByModuleNameAndName("player", "READ").ifPresent(teamOwnerPerms::add);
        permissionRepository.findByModuleNameAndName("auction", "BID").ifPresent(teamOwnerPerms::add);
        permissionRepository.findByModuleNameAndName("dashboard", "READ").ifPresent(teamOwnerPerms::add);
        permissionGroupRepository.save(PermissionGroup.builder()
                .name("Team Owner").description("Team owner with bidding access").permissions(teamOwnerPerms).build());

        Set<Permission> spectatorPerms = new HashSet<>();
        permissionRepository.findByModuleNameAndName("dashboard", "READ").ifPresent(spectatorPerms::add);
        permissionGroupRepository.save(PermissionGroup.builder()
                .name("Spectator").description("View-only access to dashboard").permissions(spectatorPerms).build());

        userRepository.save(User.builder().username("admin").passwordHash(passwordEncoder.encode("admin123"))
                .displayName("Admin").email("admin@rpl.com").isActive(true).permissionGroups(Set.of(superAdmin)).build());

        log.info("Seed data created successfully. Default login: admin / admin123");

        seedRplData();
    }

    private void seedRplData() {
        if (leagueRepository.existsBySeason("2025")) {
            log.info("RPL 2025 data already exists, skipping.");
            return;
        }
        log.info("Seeding RPL 2025 data...");

        League league = leagueRepository.save(League.builder()
                .name("RPL 2025")
                .season("2025")
                .teamBudget(new BigDecimal("100"))
                .maxPlayersPerTeam(35)
                .maxRetentionsPerTeam(5)
                .retentionCost(new BigDecimal("10"))
                .bidIncrement(new BigDecimal("0.5"))
                .timerSeconds(30)
                .build());

        User admin = userRepository.findByUsername("admin").orElseThrow();

        // Team definitions: name, shortName, color
        String[][] teamDefs = {
                {"Tribe of Titans",     "TOT", "#FF5722"},
                {"Squad of Samurais",   "SOS", "#2196F3"},
                {"Clan of Champions",   "COC", "#4CAF50"},
                {"Gang of Gladiators",  "GOG", "#9C27B0"},
                {"Force of Fighters",   "FOF", "#00BCD4"}
        };

        // Cricket players per team (player numbers 1-85)
        String[][] cricketPlayers = {
                // Titans (1-17)
                {"Abhay", "Sukesh Pasupuleti", "Manoj", "Sravanthi", "Lakshmi Hemalatha",
                 "Sai Kumar Kappala", "Subhasis Saha", "Bramhendra Reddy", "G.Tarakredy",
                 "Harsh khandelwal", "sai nitin", "Nanda Kishore Reddy Mummadi", "Rohith Basupally",
                 "Swaroop", "SuryaAkhilesh", "Rajesh Dharavath", "Naresh Kadiga"},
                // Samurais (18-34)
                {"Sujan", "Shreyas", "Ram", "Ramya potla", "Ankita Naik", "Bishal",
                 "Alokesh Sinha", "Ayansh", "Jamirul", "Vivek", "Ravi", "Uttej Patange",
                 "Ajay Vunyale", "Nehaal", "Shubham Dnyaneshwar Kale", "K Nageshwar Rao", "Sasi Pedapudi"},
                // Champions (35-51)
                {"Vikram", "Pranay", "Praveen", "Sirivalli Sambaraju", "Josna Theresa Gigo",
                 "Suraj Ragineni", "Y Siddartha Reddy", "Dheeraj", "vamsi chirumamilla", "Anoj S K",
                 "Aditya Sarkar", "Aryadipta", "Purandhar", "Raja Rohith", "Naredla Hari Gopal Reddy",
                 "Venkata Siva Prasad", "Anthony Joseph"},
                // Gladiators (52-68)
                {"Abhishek", "Anurag", "Madhu", "Aruna Shanmugam", "Annada Shukla", "Chetan Baregar",
                 "Rounak", "Parth Mishra", "Satyam Kumar", "Prakhar Maroo", "Arun Pillai", "Koushik",
                 "Hari Prasad P", "Sourya Bhattacharjee", "Priteesh M", "Nagaraj Patil", "Gourav Sharma"},
                // Fighters (69-85)
                {"Vijay", "Sai Teja", "Varun", "Arya Deshpande", "Dhaanyashree G", "Hemalatha",
                 "V Sampath Kumar", "Vinod Mylavarapu", "Hemanth.Alahari", "G Ramesh", "Gowtham Naidu",
                 "SURAJ VAIBHAV REDDY", "Chaithanya", "GONI VIVEK VARDHAN", "Naveen Ranga",
                 "Prince Pandey", "Swapnil patil"}
        };

        // Other category players per team
        String[][] otherPlayers = {
                // Titans
                {"SANTHOSH KUMAR NIMMALAPUDI", "Sanket Waghmare", "Chandra Mouli E", "srihita",
                 "Kalyan Y", "Penchala Nikitha", "Sneha", "Varshitha", "Varshine", "Kousihk Maji",
                 "Satya Ranjan", "Risabh Basin", "P. Nithish Reddy", "Shantanu Pathak",
                 "Saurav Gaonkar", "Pramod Hembrom", "Janni Eswara Rao", "Yamika Raina"},
                // Samurais
                {"Vaishnavi", "Sanjay Banerjee", "Naveen Goud", "Shubham Pathak", "Sai Chaitanya",
                 "Arempula Chandu", "Jagajjeeban Pati", "Yogendra Majjari", "RAVEENDRA BABU G",
                 "Gopanagar Srinivas Reddy", "Jyoti Ranjan Barik", "Anand M V", "Pradyumn Yadav",
                 "Priyance Sarda", "Kranthi Kumar", "Mohammed Afrith"},
                // Champions
                {"Shruti Totla", "Janga Saikrishna", "Nagesh Golla", "Srinath S", "GantiSuryaKushal",
                 "Shyam Kumar Bellam", "Santhosh M", "Gamidi Jadidiah Kingson", "Arun Maharana",
                 "Kirananand Karamchetu", "Likhil", "Sreeja Guduri", "Hari Kiran K", "Samyuktha Vajja",
                 "Prashanth R", "Sreeya Tipirisetty", "Ravi", "Venkata shiva"},
                // Gladiators
                {"Abhishek Kumar", "Pavan Manoj P", "Prashanth Goud", "Nagaraju", "Pratap",
                 "Vamsi Krishna Ayila", "suneel pradeep", "Suresh behera", "AJIJ JAMADAR",
                 "Dinesh Bandela", "Dwaipayan Biswas", "Apratim Kumar Singh", "Pallavi",
                 "Sandeep Dillerao", "p. shalin", "Nupur Ashturkar"},
                // Fighters
                {"Anil Kumar K", "Raghunandana", "Saganti.Akhil", "Prateek Rathi", "Kalagiri Rakesh",
                 "Revanth Rallabandi", "mohankumar kodi", "Modi sreenath", "Vishal kotwani",
                 "P Vijayasri", "Aditya Th", "Sree", "NAGARAJU BANDI", "K pavan sai",
                 "G Keerthi", "Anurag Mishra", "Atharva patil"}
        };

        int playerNumber = 1;
        for (int t = 0; t < teamDefs.length; t++) {
            Team team = teamRepository.save(Team.builder()
                    .name(teamDefs[t][0])
                    .shortName(teamDefs[t][1])
                    .color(teamDefs[t][2])
                    .owner(admin)
                    .league(league)
                    .budget(league.getTeamBudget())
                    .build());

            // Seed cricket players
            Long captainId = null;
            for (int i = 0; i < cricketPlayers[t].length; i++) {
                boolean isCaptain = (i == 1);
                Player player = playerRepository.save(Player.builder()
                        .name(cricketPlayers[t][i])
                        .playerNumber(playerNumber++)
                        .category(Player.PlayerCategory.CRICKET)
                        .status(Player.PlayerStatus.RETAINED)
                        .isCaptain(isCaptain)
                        .team(team)
                        .league(league)
                        .build());
                if (isCaptain) {
                    captainId = player.getId();
                }
            }

            // Update team with captain
            if (captainId != null) {
                team.setCaptainId(captainId);
                teamRepository.save(team);
            }

            // Seed other category players
            for (String name : otherPlayers[t]) {
                playerRepository.save(Player.builder()
                        .name(name)
                        .category(Player.PlayerCategory.OTHER)
                        .status(Player.PlayerStatus.RETAINED)
                        .team(team)
                        .league(league)
                        .build());
            }
        }

        log.info("RPL 2025 data seeded successfully: 5 teams, 85 cricket players, and other category players.");
    }
}
