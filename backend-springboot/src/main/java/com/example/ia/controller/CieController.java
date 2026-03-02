package com.example.ia.controller;

import com.example.ia.entity.Announcement;
import com.example.ia.entity.Notification;
import com.example.ia.entity.Subject;
import com.example.ia.entity.User;
import com.example.ia.repository.AnnouncementRepository;
import com.example.ia.repository.NotificationRepository;
import com.example.ia.repository.SubjectRepository;
import com.example.ia.repository.UserRepository;
import com.example.ia.service.CieService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/cie")
public class CieController {

    @Autowired
    CieService cieService;

    @Autowired
    AnnouncementRepository announcementRepository;

    @Autowired
    SubjectRepository subjectRepository;

    @Autowired
    UserRepository userRepository;

    @Autowired
    NotificationRepository notificationRepository;

    @Value("${app.upload.dir:uploads/questions}")
    private String uploadDir;

    // ========== STUDENT ENDPOINTS ==========

    @GetMapping("/student/announcements")
    @PreAuthorize("hasRole('STUDENT')")
    public List<Announcement> getStudentAnnouncements() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return cieService.getStudentAnnouncements(username);
    }

    @GetMapping("/student/notifications")
    @PreAuthorize("hasRole('STUDENT')")
    public List<Notification> getStudentNotifications() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return cieService.getStudentNotifications(username);
    }

    // ========== FACULTY ENDPOINTS ==========

    @GetMapping("/faculty/schedules")
    @PreAuthorize("hasRole('FACULTY')")
    public List<Announcement> getFacultySchedules() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return cieService.getFacultySchedules(username);
    }

    @PostMapping("/faculty/announcements")
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<?> createFacultyAnnouncement(@RequestBody Map<String, Object> data) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User faculty = userRepository.findByUsernameIgnoreCase(username).orElse(null);
        if (faculty == null)
            return ResponseEntity.badRequest().body(Map.of("message", "Faculty not found"));

        Long subjectId = Long.valueOf(data.get("subjectId").toString());
        Subject subject = subjectRepository.findById(subjectId).orElse(null);
        if (subject == null)
            return ResponseEntity.badRequest().body(Map.of("message", "Subject not found"));

        Announcement ann = new Announcement();
        ann.setSubject(subject);
        ann.setFaculty(faculty);
        ann.setCieNumber(data.getOrDefault("cieNumber", "CIE-1").toString());
        ann.setScheduledDate(data.containsKey("scheduledDate") ? LocalDate.parse(data.get("scheduledDate").toString())
                : LocalDate.now().plusDays(7));
        ann.setStartTime(data.getOrDefault("startTime", "10:00 AM").toString());
        ann.setDurationMinutes(
                data.containsKey("durationMinutes") ? Integer.parseInt(data.get("durationMinutes").toString()) : 60);
        ann.setExamRoom(data.getOrDefault("examRoom", "TBD").toString());
        ann.setStatus("SCHEDULED");

        announcementRepository.save(ann);
        return ResponseEntity.ok(ann);
    }

    @PutMapping("/faculty/announcements/syllabus")
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<?> updateSyllabus(@RequestBody Map<String, Object> data) {
        Long subjectId = Long.valueOf(data.get("subjectId").toString());
        String cieNumber = data.get("cieNumber").toString();
        String syllabus = data.getOrDefault("syllabusCoverage", "").toString();

        List<Announcement> matches = announcementRepository.findBySubjectIdIn(List.of(subjectId));
        Announcement existing = matches.stream()
                .filter(a -> cieNumber.equals(a.getCieNumber()))
                .findFirst()
                .orElse(null);

        if (existing == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message",
                            "No CIE schedule found for this subject and CIE number. HOD must schedule it first."));
        }

        existing.setSyllabusCoverage(syllabus);
        announcementRepository.save(existing);
        return ResponseEntity.ok(existing);
    }

    @PutMapping("/hod/announcements/syllabus")
    @PreAuthorize("hasRole('HOD')")
    public ResponseEntity<?> updateSyllabusHod(@RequestBody Map<String, Object> data) {
        Long subjectId = Long.valueOf(data.get("subjectId").toString());
        String cieNumber = data.get("cieNumber").toString();
        String syllabus = data.getOrDefault("syllabusCoverage", "").toString();

        Subject subject = subjectRepository.findById(subjectId).orElse(null);
        if (subject == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Subject not found."));
        }

        List<Announcement> matches = announcementRepository.findBySubjectIdIn(List.of(subjectId));
        Announcement existing = matches.stream()
                .filter(a -> cieNumber.equals(a.getCieNumber()))
                .findFirst()
                .orElse(null);

        if (existing == null) {
            Announcement ann = new Announcement();
            ann.setSubject(subject);
            ann.setCieNumber(cieNumber);
            ann.setSyllabusCoverage(syllabus);
            ann.setScheduledDate(LocalDate.now());
            ann.setStartTime("TBD");
            ann.setDurationMinutes(60);
            ann.setExamRoom("TBD");
            ann.setStatus("SYLLABUS_ONLY");
            announcementRepository.save(ann);
            return ResponseEntity.ok(ann);
        }

        existing.setSyllabusCoverage(syllabus);
        announcementRepository.save(existing);
        return ResponseEntity.ok(existing);
    }

    @GetMapping("/faculty/announcements/details")
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<?> getFacultyAnnouncementDetails(
            @RequestParam Long subjectId,
            @RequestParam(required = false) String cieNumber) {
        Subject subject = subjectRepository.findById(subjectId).orElse(null);
        if (subject == null)
            return ResponseEntity.ok(List.of());
        List<Announcement> all = announcementRepository.findBySubjectIdIn(List.of(subjectId));
        if (cieNumber != null) {
            all = all.stream().filter(a -> cieNumber.equals(a.getCieNumber())).toList();
        }
        return ResponseEntity.ok(all);
    }

    // ========== FACULTY: UPLOAD QUESTION PAPER ==========

    @PostMapping("/faculty/upload-question")
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<?> uploadQuestionPaper(
            @RequestParam("file") MultipartFile file,
            @RequestParam("subjectId") Long subjectId,
            @RequestParam("cieNumber") String cieNumber) {

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User faculty = userRepository.findByUsernameIgnoreCase(username).orElse(null);
        if (faculty == null)
            return ResponseEntity.badRequest().body(Map.of("message", "Faculty not found"));

        Subject subject = subjectRepository.findById(subjectId).orElse(null);
        if (subject == null)
            return ResponseEntity.badRequest().body(Map.of("message", "Subject not found"));

        try {
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            String originalFilename = file.getOriginalFilename();
            String storedFilename = subjectId + "_CIE" + cieNumber + "_" + System.currentTimeMillis() + "_"
                    + originalFilename;
            Path filePath = uploadPath.resolve(storedFilename);
            Files.copy(file.getInputStream(), filePath);

            // Find or create announcement for this subject+CIE
            List<Announcement> matches = announcementRepository.findBySubjectIdIn(List.of(subjectId));
            Announcement ann = matches.stream()
                    .filter(a -> cieNumber.equals(a.getCieNumber()))
                    .findFirst()
                    .orElse(null);

            if (ann == null) {
                ann = new Announcement();
                ann.setSubject(subject);
                ann.setFaculty(faculty);
                ann.setCieNumber(cieNumber);
                ann.setScheduledDate(LocalDate.now());
                ann.setStartTime("TBD");
                ann.setDurationMinutes(60);
                ann.setExamRoom("TBD");
                ann.setStatus("SCHEDULED");
            }

            ann.setQuestionPaperPath(storedFilename);
            announcementRepository.save(ann);

            return ResponseEntity.ok(Map.of(
                    "message", "Question paper uploaded successfully",
                    "filename", storedFilename));

        } catch (IOException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Failed to upload file: " + e.getMessage()));
        }
    }

    // ========== DOWNLOAD QUESTION PAPER ==========

    @GetMapping("/download/{filename:.+}")
    public ResponseEntity<Resource> downloadQuestionPaper(
            @PathVariable String filename,
            @RequestParam(required = false, defaultValue = "false") boolean view) {
        try {
            Path filePath = Paths.get(uploadDir).resolve(filename).normalize();
            Resource resource = new UrlResource(filePath.toUri());

            if (!resource.exists()) {
                return ResponseEntity.notFound().build();
            }

            String contentType = "application/octet-stream";
            if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
                contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            } else if (filename.endsWith(".pdf")) {
                contentType = "application/pdf";
            } else if (filename.endsWith(".docx")) {
                contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            } else if (filename.endsWith(".doc")) {
                contentType = "application/msword";
            }

            String disposition = view ? "inline" : "attachment";

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, disposition + "; filename=\"" + filename + "\"")
                    .body(resource);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // ========== HOD ENDPOINTS ==========

    @GetMapping("/hod/announcements")
    @PreAuthorize("hasRole('HOD') or hasRole('PRINCIPAL')")
    public List<Announcement> getHodAnnouncements() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User hod = userRepository.findByUsernameIgnoreCase(username).orElse(null);
        if (hod == null)
            return List.of();
        return announcementRepository.findBySubjectDepartment(hod.getDepartment());
    }

    @GetMapping("/hod/notifications")
    @PreAuthorize("hasRole('HOD') or hasRole('PRINCIPAL')")
    public List<Notification> getHodNotifications() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User hod = userRepository.findByUsernameIgnoreCase(username).orElse(null);
        if (hod == null)
            return List.of();
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(hod.getId());
    }

    // ========== HOD/PRINCIPAL CREATE ANNOUNCEMENTS ==========

    @PostMapping("/announcements")
    public ResponseEntity<?> createAnnouncement(@RequestBody Map<String, Object> data) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Long subjectId = Long.valueOf(data.get("subjectId").toString());

        System.out.println(
                "CIE Announcement Request: User=" + username + ", SubjectId=" + subjectId + ", Data=" + data);

        if ("anonymousUser".equals(username) || username == null) {
            if (data.containsKey("senderId")) {
                username = data.get("senderId").toString();
                System.out.println("Auth failed, using senderId from body: " + username);
            }
        }

        User creator = userRepository.findByUsernameIgnoreCase(username).orElse(null);
        Subject subject = subjectRepository.findById(subjectId).orElse(null);

        if (creator == null || subject == null) {
            System.out.println("CreateAnnouncement Failed: Creator="
                    + (creator == null ? "null" : creator.getUsername())
                    + ", Subject=" + (subject == null ? "null" : subject.getName()));
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid request"));
        }

        Announcement ann = new Announcement();
        ann.setSubject(subject);
        ann.setFaculty(creator);
        ann.setCieNumber(data.getOrDefault("cieNumber", "CIE-1").toString());
        ann.setScheduledDate(data.containsKey("scheduledDate") ? LocalDate.parse(data.get("scheduledDate").toString())
                : LocalDate.now().plusDays(7));
        ann.setStartTime(data.getOrDefault("startTime", "10:00 AM").toString());
        ann.setDurationMinutes(
                data.containsKey("durationMinutes") ? Integer.parseInt(data.get("durationMinutes").toString()) : 60);
        ann.setExamRoom(data.getOrDefault("examRoom", "TBD").toString());
        ann.setStatus("SCHEDULED");

        announcementRepository.save(ann);
        return ResponseEntity.ok(ann);
    }

    @PutMapping("/announcements/{id}")
    @PreAuthorize("hasRole('HOD') or hasRole('PRINCIPAL')")
    public ResponseEntity<?> updateAnnouncement(@PathVariable Long id, @RequestBody Map<String, Object> data) {
        Announcement ann = announcementRepository.findById(id).orElse(null);
        if (ann == null) {
            return ResponseEntity.notFound().build();
        }

        if (data.containsKey("scheduledDate")) {
            ann.setScheduledDate(LocalDate.parse(data.get("scheduledDate").toString()));
        }
        if (data.containsKey("startTime")) {
            ann.setStartTime(data.get("startTime").toString());
        }
        if (data.containsKey("durationMinutes")) {
            ann.setDurationMinutes(Integer.parseInt(data.get("durationMinutes").toString()));
        }
        if (data.containsKey("examRoom")) {
            ann.setExamRoom(data.get("examRoom").toString());
        }

        announcementRepository.save(ann);
        return ResponseEntity.ok(ann);
    }

    @DeleteMapping("/announcements/{id}")
    @PreAuthorize("hasRole('HOD') or hasRole('PRINCIPAL')")
    public ResponseEntity<?> deleteAnnouncement(@PathVariable Long id) {
        if (!announcementRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        announcementRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
