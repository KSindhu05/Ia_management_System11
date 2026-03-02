package com.example.ia.service;

import com.example.ia.entity.CieMark;
import com.example.ia.entity.FacultyAssignmentRequest;
import com.example.ia.entity.Student;
import com.example.ia.entity.Subject;
import com.example.ia.entity.User;
import com.example.ia.payload.response.FacultyClassAnalytics;
import com.example.ia.payload.response.SubjectWithRoleDto;
import com.example.ia.repository.CieMarkRepository;
import com.example.ia.repository.FacultyAssignmentRequestRepository;
import com.example.ia.repository.StudentRepository;
import com.example.ia.repository.SubjectRepository;
import com.example.ia.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class FacultyService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private CieMarkRepository cieMarkRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private FacultyAssignmentRequestRepository assignmentRequestRepository;

    // ---------------------------------------------------------------
    // Parse the comma-separated section field into a list of sections.
    // e.g. "A,B" → ["A", "B"]
    // ---------------------------------------------------------------
    private List<String> parseSections(User user) {
        if (user.getSection() == null || user.getSection().isBlank()) {
            return List.of();
        }
        return Arrays.stream(user.getSection().split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
    }

    // ---------------------------------------------------------------
    // Returns students this faculty is allowed to see.
    // Home dept: uses faculty's own department + sections.
    // Cross-dept: filters by each approved request's dept + its sections.
    // ---------------------------------------------------------------
    public List<Student> getStudentsForFaculty(String username) {
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null)
            return List.of();

        List<String> homeSections = parseSections(user);

        // Use faculty's own department as home department
        String homeDept = user.getDepartment();

        List<FacultyAssignmentRequest> approvedRequests = assignmentRequestRepository
                .findByFacultyId(user.getId());

        // Merge any sections explicitly requested for the home department
        Set<String> allHomeSections = new HashSet<>(homeSections);
        for (FacultyAssignmentRequest req : approvedRequests) {
            if ("APPROVED".equals(req.getStatus()) && homeDept != null && homeDept.equals(req.getTargetDepartment())) {
                if (req.getSections() != null && !req.getSections().isBlank()) {
                    Arrays.stream(req.getSections().split(","))
                            .map(String::trim)
                            .filter(s -> !s.isEmpty())
                            .forEach(allHomeSections::add);
                }
            }
        }
        homeSections = new ArrayList<>(allHomeSections);

        List<Student> result = new ArrayList<>();
        Set<Long> addedIds = new HashSet<>();

        // 1. Home department students — use faculty's own department + sections
        if (homeDept != null && !homeDept.isBlank()) {
            List<Student> homeStudents;
            if (!homeSections.isEmpty()) {
                homeStudents = studentRepository.findByDepartmentInAndSectionIn(
                        List.of(homeDept), new ArrayList<>(homeSections));
            } else {
                homeStudents = studentRepository.findByDepartment(homeDept);
            }
            for (Student s : homeStudents) {
                if (addedIds.add(s.getId()))
                    result.add(s);
            }
        }

        // 2. Cross-department students — use each request's own sections
        for (FacultyAssignmentRequest req : approvedRequests) {
            if (!"APPROVED".equals(req.getStatus()))
                continue;

            String dept = req.getTargetDepartment();
            if (dept == null || dept.isBlank())
                continue;

            // Parse request-specific sections
            List<String> reqSections = new ArrayList<>();
            if (req.getSections() != null && !req.getSections().isBlank()) {
                reqSections = Arrays.stream(req.getSections().split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .collect(Collectors.toList());
            }

            List<Student> crossStudents;
            if (!reqSections.isEmpty()) {
                crossStudents = studentRepository.findByDepartmentInAndSectionIn(
                        List.of(dept), reqSections);
            } else {
                crossStudents = studentRepository.findByDepartment(dept);
            }
            for (Student s : crossStudents) {
                if (addedIds.add(s.getId()))
                    result.add(s);
            }
        }

        return result;
    }

    public List<SubjectWithRoleDto> getSubjectsForFaculty(String username) {
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null)
            return List.of();

        List<SubjectWithRoleDto> result = new ArrayList<>();
        Set<Long> addedIds = new HashSet<>();

        // 1. Home department subjects — filter by faculty's own department
        String homeDept = user.getDepartment();
        String homeCieRole = user.getCieRole(); // null = ALL
        if (user.getSubjects() != null && !user.getSubjects().isBlank() &&
                homeDept != null && !homeDept.isBlank()) {
            List<String> homeSubjectNames = Arrays.stream(user.getSubjects().split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toList());
            if (!homeSubjectNames.isEmpty()) {
                List<Subject> homeSubjects = subjectRepository.findByNameInAndDepartment(
                        homeSubjectNames, homeDept);
                for (Subject s : homeSubjects) {
                    if (addedIds.add(s.getId()))
                        result.add(new SubjectWithRoleDto(s, homeCieRole));
                }
            }
        }

        // 2. Cross-department subjects — use each approved request's cieRole
        List<FacultyAssignmentRequest> approvedRequests = assignmentRequestRepository
                .findByFacultyId(user.getId());
        for (FacultyAssignmentRequest req : approvedRequests) {
            if (!"APPROVED".equals(req.getStatus()) || req.getSubjects() == null)
                continue;

            List<String> crossSubjectNames = Arrays.stream(req.getSubjects().split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toList());
            if (!crossSubjectNames.isEmpty()) {
                List<Subject> crossSubjects = subjectRepository.findByNameInAndDepartment(
                        crossSubjectNames, req.getTargetDepartment());
                for (Subject s : crossSubjects) {
                    if (addedIds.add(s.getId()))
                        result.add(new SubjectWithRoleDto(s, req.getCieRole()));
                }
            }
        }

        return result;
    }

    public FacultyClassAnalytics getAnalytics(String username) {
        List<Student> allowedStudents = getStudentsForFaculty(username);
        Set<Long> allowedStudentIds = allowedStudents.stream().map(Student::getId).collect(Collectors.toSet());

        List<SubjectWithRoleDto> subjects = getSubjectsForFaculty(username);
        double totalScore = 0;
        int scoredCount = 0;
        int low = 0;
        int top = 0;
        Set<Long> uniqueStudents = new HashSet<>();
        List<FacultyClassAnalytics.LowPerformer> lowList = new ArrayList<>();

        for (SubjectWithRoleDto sub : subjects) {
            List<CieMark> marks = cieMarkRepository.findBySubject_Id(sub.getId());
            for (CieMark mark : marks) {
                if (mark.getStudent() == null)
                    continue;

                // Skip students not in the faculty's allowed list
                if (!allowedStudentIds.contains(mark.getStudent().getId())) {
                    continue;
                }

                uniqueStudents.add(mark.getStudent().getId());

                if (mark.getMarks() != null && mark.getMarks() > 0) {
                    double score = mark.getMarks();
                    totalScore += score;
                    scoredCount++;

                    if (score < 20) {
                        low++;
                        if (lowList.size() < 5) {
                            lowList.add(new FacultyClassAnalytics.LowPerformer(
                                    mark.getStudent().getRegNo(), mark.getStudent().getName(), sub.getName(),
                                    mark.getCieType(), score, mark.getAttendancePercentage(),
                                    mark.getStudent().getParentPhone()));
                        }
                    }
                    if (score >= 40) {
                        top++;
                    }
                }
            }
        }

        int evaluated = uniqueStudents.size();
        int pending = allowedStudents.size() - evaluated;
        double avg = scoredCount > 0 ? Math.round((totalScore / scoredCount / 50.0 * 100) * 10.0) / 10.0 : 0;
        return new FacultyClassAnalytics(evaluated, pending, avg, low, top, allowedStudents.size(), lowList);
    }
}
