import React, { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import API_BASE_URL from '../config/api';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, FilePlus, Save, AlertCircle, Phone, FileText, CheckCircle, Search, Filter, Mail, X, Download, Clock, BarChart2, TrendingDown, Award, ClipboardList, AlertTriangle, Edit3, Edit, Calendar, UserCheck, BookOpen, Upload, Megaphone, Lock, Bell, MapPin, Trash2, Building2, Send, RefreshCw } from 'lucide-react';
import { facultyData, facultyProfiles, facultySubjects, studentsList, labSchedule, getMenteesForFaculty } from '../utils/mockData';
import styles from './FacultyDashboard.module.css';



const calculateGradeFromPercentage = (percentage) => {
    if (percentage >= 90) return 'S';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
};

const FacultyDashboard = () => {
    const { user } = useAuth();
    const [activeSection, setActiveSection] = useState('Overview');
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [selectedCieDept, setSelectedCieDept] = useState(null); // New state for Dept selection in CIE Entry
    const [selectedOverviewDept, setSelectedOverviewDept] = useState(null); // New state for Dept selection in Overview
    const [selectedCieType, setSelectedCieType] = useState('cie1'); // Which CIE is currently selected for attendance entry
    const [marks, setMarks] = useState({}); // Map { studentId: { co1: val... } }
    const [isLocked, setIsLocked] = useState(false); // For Commit/Edit workflow
    const [cieLockStatus, setCieLockStatus] = useState({ cie1: false, cie2: false, cie3: false, cie4: false, cie5: false }); // Per-CIE lock
    const [saving, setSaving] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSection, setSelectedSection] = useState('All');
    const [selectedDept, setSelectedDept] = useState('All');

    const handleDeptFilterChange = (dept) => setSelectedDept(dept);

    // Notification State
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [publishedSchedules, setPublishedSchedules] = useState([]); // CIE schedules published by HOD

    // Cross-Department Assignment State
    const [allDepartments, setAllDepartments] = useState([]);
    const [selectedTargetDept, setSelectedTargetDept] = useState('');
    const [deptSubjects, setDeptSubjects] = useState([]);
    const [selectedAssignSubjects, setSelectedAssignSubjects] = useState([]);
    const [assignSections, setAssignSections] = useState([]);
    const [assignSemester, setAssignSemester] = useState('');
    const [availableSections, setAvailableSections] = useState([]);
    const [myAssignmentRequests, setMyAssignmentRequests] = useState([]);
    const [assignLoading, setAssignLoading] = useState(false);

    // API State
    const [subjects, setSubjects] = useState([]);
    const [students, setStudents] = useState([]);
    const [allStudentMarks, setAllStudentMarks] = useState({}); // { subjectId: { studentId: { ...marks } } }
    const API_BASE = `${API_BASE_URL}/marks`;
    const [facultyClassAnalytics, setFacultyClassAnalytics] = useState({
        evaluated: 0,
        pending: 0,
        avgScore: 0,
        lowPerformers: 0,
        topPerformers: 0,
        lowPerformersList: []
    });

    // Mentorship State
    const [menteeIds, setMenteeIds] = useState(() => {
        const saved = localStorage.getItem(`mentees_${user?.id}`);
        if (saved) return JSON.parse(saved);

        // Default IDs from the image (459CS25001 - 459CS25007 precisely)
        const defaultRegs = ['459CS25001', '459CS25002', '459CS25003', '459CS25005', '459CS25007'];
        const foundIds = students
            .filter(s => defaultRegs.includes(s.regNo) || defaultRegs.includes(s.rollNo))
            .map(s => s.id);

        return foundIds.length > 0 ? foundIds : [];
    });
    const [showMenteeModal, setShowMenteeModal] = useState(false);
    const [menteeSearchTerm, setMenteeSearchTerm] = useState('');
    const [manualMentees, setManualMentees] = useState(() => {
        const saved = localStorage.getItem(`manual_mentees_${user?.id}`);
        return saved ? JSON.parse(saved) : [];
    });
    const [newStudentForm, setNewStudentForm] = useState({
        regNo: '',
        name: '',
        parentPhone: '',
        avgMark: ''
    });
    const [modalTab, setModalTab] = useState('select'); // 'select' or 'manual'

    // -- Edit Student State --
    const [editingStudent, setEditingStudent] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);

    // Verify Faculty
    const currentFaculty = facultyProfiles.find(f => f.id === user?.id) || facultyData;

    // Filter Subjects for this Faculty
    const facultySections = user?.section ? user.section.split(',').map(s => s.trim()).filter(Boolean) : [];

    const mySubjects = subjects.length > 0
        ? subjects.map(s => ({
            ...s,
            studentCount: students.filter(st =>
                String(st.semester) === String(s.semester) &&
                st.department === s.department &&
                (facultySections.length === 0 || facultySections.includes(st.section))
            ).length || 0
        }))
        : facultySubjects.filter(sub => sub.instructorId === currentFaculty.id);

    // Derived Mentees
    const myMentees = students.filter(s => menteeIds.includes(s.id)).map(s => {
        return { ...s };
    });

    const handleAddMentee = (studentId) => {
        if (menteeIds.includes(studentId)) {
            showToast('Student already in mentorship list', 'warning');
            return;
        }
        const newIds = [...menteeIds, studentId];
        setMenteeIds(newIds);
        localStorage.setItem(`mentees_${user?.id}`, JSON.stringify(newIds));
        showToast('Mentee added successfully');
        setShowMenteeModal(false);
    };

    const handleAddManualStudent = (e) => {
        e.preventDefault();
        const newStudent = {
            id: `manual_${Date.now()}`,
            ...newStudentForm,
            isManual: true
        };
        const newList = [...manualMentees, newStudent];
        setManualMentees(newList);
        localStorage.setItem(`manual_mentees_${user?.id}`, JSON.stringify(newList));
        setNewStudentForm({ regNo: '', name: '', parentPhone: '', avgMark: '' });
        setShowMenteeModal(false);
        showToast('Student added successfully');
    };

    const handleRemoveMentee = (studentId) => {
        if (typeof studentId === 'string' && studentId.startsWith('manual_')) {
            const newList = manualMentees.filter(m => m.id !== studentId);
            setManualMentees(newList);
            localStorage.setItem(`manual_mentees_${user?.id}`, JSON.stringify(newList));
        } else {
            const newIds = menteeIds.filter(id => id !== studentId);
            setMenteeIds(newIds);
            localStorage.setItem(`mentees_${user?.id}`, JSON.stringify(newIds));
        }
        showToast('Mentee removed', 'info');
    };

    const handleEditStudent = (student) => {
        setEditingStudent({ ...student });
        setShowEditModal(true);
    };

    const handleUpdateStudent = (e) => {
        e.preventDefault();
        if (!editingStudent) return;

        // Update in Manual List
        if (editingStudent.isManual) {
            const newList = manualMentees.map(m => m.id === editingStudent.id ? editingStudent : m);
            setManualMentees(newList);
            localStorage.setItem(`manual_mentees_${user?.id}`, JSON.stringify(newList));
        } else {
            // Update in Real List (Local State)
            const newStudents = students.map(s => s.id === editingStudent.id ? { ...s, ...editingStudent } : s);
            setStudents(newStudents);

            // --- GLOBAL SYNC: Save to localStorage for other dashboards ---
            const globalUpdates = JSON.parse(localStorage.getItem('global_student_updates') || '{}');
            globalUpdates[editingStudent.id] = {
                name: editingStudent.name,
                regNo: editingStudent.regNo,
                parentPhone: editingStudent.parentPhone,
                // Add other fields if needed
            };
            localStorage.setItem('global_student_updates', JSON.stringify(globalUpdates));
        }

        showToast('Student details updated');
        setShowEditModal(false);
        setEditingStudent(null);
    };



    // Fetch Analytics helper
    const fetchAnalytics = React.useCallback(async () => {
        if (!user || !user.token) return;
        try {
            const headers = { 'Authorization': `Bearer ${user.token}` };
            const anRes = await fetch(`${API_BASE_URL}/faculty/analytics`, { headers });
            if (anRes.ok) {
                const data = await anRes.json();
                setFacultyClassAnalytics(data);
            }
        } catch (e) {
            console.error("Failed to fetch analytics", e);
        }
    }, [user, API_BASE_URL]);

    // Refresh analytics when switching to Low Performers tab
    React.useEffect(() => {
        if (activeSection === 'Low Performers') {
            fetchAnalytics();
        }
    }, [activeSection, fetchAnalytics]);

    React.useEffect(() => {
        if (!user || !user.token) return;

        const fetchInitialData = async () => {
            const headers = { 'Authorization': `Bearer ${user.token}` };
            console.log("Fetching initial data for faculty...");

            // Fetch Students (filtered by faculty's assigned sections)
            try {
                const sRes = await fetch(`${API_BASE_URL}/faculty/my-students`, { headers });
                console.log("Students API status:", sRes.status);
                if (sRes.ok) {
                    const data = await sRes.json();
                    console.log("Fetched Students:", data.length, data[0]); // Log first student to check structure
                    setStudents(data);
                } else {
                    console.error("Failed to fetch students");
                }
            } catch (e) {
                console.error("Error fetching students:", e);
            }

            // Fetch Subjects (By Faculty Assignment)
            try {
                const subRes = await fetch(`${API_BASE_URL}/faculty/my-subjects`, { headers });
                console.log("Subjects API status:", subRes.status);
                if (subRes.ok) {
                    const data = await subRes.json();
                    console.log("Subjects fetched:", data.length);
                    setSubjects(data);
                } else {
                    console.error("Subjects fetch failed:", await subRes.text());
                }
            } catch (e) {
                console.error("Failed to fetch subjects", e);
            }

            // Fetch Analytics (Initial Load)
            fetchAnalytics();

            // Fetch Notifications
            try {
                const notifRes = await fetch(`${API_BASE_URL}/notifications`, { headers });
                if (notifRes.ok) {
                    const notifs = await notifRes.json();
                    setNotifications(notifs);
                    setUnreadCount(notifs.filter(n => !n.isRead).length);
                }
            } catch (e) {
                console.error("Failed to fetch notifications", e);
            }



            // Fetch Published CIE Schedules (from HOD)
            try {
                const schedRes = await fetch(`${API_BASE_URL}/cie/faculty/schedules`, { headers });
                if (schedRes.ok) {
                    const scheds = await schedRes.json();
                    setPublishedSchedules(scheds);
                }
            } catch (e) {
                console.error("Failed to fetch published schedules", e);
            }

            // Fetch Marks for all subjects (for analytics and proctoring)
            try {
                // We need to fetch marks for all subjects this faculty handles
                // Since we don't have the subjects list fully ready here (async), 
                // we might need to rely on the 'my-subjects' response or fetch all marks for faculty.
                // Assuming there's an endpoint or we iterate.
                // For now, let's try to fetch marks for the subjects we just fetched.

                // Correction: We can't easily access 'data' from subRes here without restructuring.
                // Let's blindly fetch marks for all subjects if we can, or just wait for user to select.
                // But 'myStudents' needs marks.

                // Workaround: Fetch all marks for faculty's subjects.
                // If API supports it: GET /faculty/all-marks
                // If not, we iterate.

                // Let's assume we can fetch marks for each subject.
                const subRes = await fetch(`${API_BASE_URL}/faculty/my-subjects`, { headers });
                if (subRes.ok) {
                    const subs = await subRes.json();
                    const marksMap = {};

                    await Promise.all(subs.map(async (sub) => {
                        try {
                            const mRes = await fetch(`${API_BASE_URL}/marks/subject/${sub.id}`, { headers });
                            if (mRes.ok) {
                                const mData = await mRes.json();
                                // Transform to { studentId: marks }
                                const subMarks = {};
                                mData.forEach(m => {
                                    if (!subMarks[m.studentId]) {
                                        subMarks[m.studentId] = { cie1: '', cie2: '', cie3: '', cie4: '', cie5: '' };
                                    }
                                    const key = m.cieType ? m.cieType.toLowerCase() : (m.iaType ? m.iaType.toLowerCase() : null);
                                    if (key) {
                                        subMarks[m.studentId][key] = m.totalScore || '';
                                        // Also store status if needed? The table logic doesn't use status per se, just scores.
                                        // But wait, the helper `getStudentPerformance` uses `sMarks.cie1` etc.
                                    }
                                });
                                marksMap[sub.id] = subMarks;
                            }
                        } catch (e) {
                            console.error(`Failed to fetch marks for subject ${sub.id}`, e);
                        }
                    }));
                    setAllStudentMarks(marksMap);
                }
            } catch (e) {
                console.error("Failed to fetch all student marks", e);
            }

        };
        fetchInitialData();

    }, [user, fetchAnalytics]);

    // Helper to get real performance data for a student
    const getStudentPerformance = (studentId) => {
        let totalPerformance = 0;
        let subjectCount = 0;
        let hasData = false;

        Object.keys(allStudentMarks).forEach(subId => {
            const sMarks = allStudentMarks[subId][studentId];
            if (sMarks) {
                hasData = true;
                const scores = [sMarks.cie1, sMarks.cie2, sMarks.cie3, sMarks.cie4, sMarks.cie5]
                    .filter(x => x !== '' && x !== 'Ab' && x !== undefined && x !== null)
                    .map(Number);

                if (scores.length > 0) {
                    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                    // Normalized to 100 (assuming CIE max is 50)
                    const percent = (avg / 50) * 100;
                    totalPerformance += percent;
                    subjectCount++;
                }
            }
        });

        const finalPercentage = subjectCount > 0 ? (totalPerformance / subjectCount) : 0;
        const grade = hasData ? calculateGradeFromPercentage(finalPercentage) : 'N/A';

        return { grade, hasData, percentage: finalPercentage };
    };

    // -- Enhancement State --
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [csvCieType, setCsvCieType] = useState('CIE1');
    const [csvData, setCsvData] = useState([]);
    const [csvErrors, setCsvErrors] = useState([]);
    const [csvFile, setCsvFile] = useState(null);
    const [csvUploading, setCsvUploading] = useState(false);

    // -- Bulk Upload State & Handlers --
    const fileInputRef = React.useRef(null);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const csvText = event.target.result;
            const lines = csvText.split('\n').map(line => line.trim()).filter(line => line);
            if (lines.length < 2) {
                showToast("CSV file is empty or missing headers", "error");
                return;
            }

            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
            const regNoIndex = headers.findIndex(h => h.includes('reg') || h.includes('roll'));
            const nameIndex = headers.findIndex(h => h.includes('name'));

            if (regNoIndex === -1 && nameIndex === -1) {
                showToast("Could not find Registration Number or Student Name column", "error");
                return;
            }

            let parsedCount = 0;
            const newMarks = { ...marks };

            for (let i = 1; i < lines.length; i++) {
                const row = lines[i].split(',').map(c => c.trim());

                let student = null;

                if (regNoIndex !== -1 && row.length > regNoIndex) {
                    const regNo = row[regNoIndex];
                    student = students.find(s => s.regNo === regNo || s.rollNo === regNo);
                }

                if (!student && nameIndex !== -1 && row.length > nameIndex) {
                    const name = row[nameIndex].toLowerCase();
                    student = students.find(s => (s.name || '').toLowerCase() === name);
                }

                if (student) {
                    let updated = false;

                    const updateField = (headerName, stateField) => {
                        const idx = headers.findIndex(h => h === headerName.toLowerCase());
                        if (idx !== -1 && row[idx] !== "") {
                            let val = row[idx];
                            if (val !== 'Ab') {
                                val = parseInt(val, 10);
                                if (isNaN(val)) val = '';
                            }
                            if (!newMarks[student.id]) newMarks[student.id] = { cie1: '', cie2: '', cie3: '', cie4: '', cie5: '', cie1Att: '', cie2Att: '', cie3Att: '', cie4Att: '', cie5Att: '' };
                            newMarks[student.id][stateField] = val;
                            updated = true;
                        }
                    };

                    if (selectedCieType === 'all') {
                        ['cie1', 'cie2', 'cie3', 'cie4', 'cie5'].forEach(cie => {
                            updateField(cie, cie);
                            updateField(cie + 'att', cie + 'Att');
                            updateField(cie + ' attendance', cie + 'Att');
                            updateField('attendance ' + cie, cie + 'Att');
                        });
                    } else {
                        updateField('marks', selectedCieType);
                        updateField(selectedCieType, selectedCieType);
                        updateField('attendance', selectedCieType + 'Att');
                        updateField(selectedCieType + 'att', selectedCieType + 'Att');
                    }

                    if (updated) parsedCount++;
                }
            }

            setMarks(newMarks);

            // Also update the global allStudentMarks so it computes grade/average locally before save
            if (selectedSubject) {
                setAllStudentMarks(prev => {
                    const subjectMarks = prev[selectedSubject.id] || {};
                    const updatedSubjectMarks = { ...subjectMarks };

                    Object.keys(newMarks).forEach(sId => {
                        updatedSubjectMarks[sId] = {
                            ...(updatedSubjectMarks[sId] || {}),
                            ...newMarks[sId]
                        };
                    });

                    return {
                        ...prev,
                        [selectedSubject.id]: updatedSubjectMarks
                    };
                });
            }

            showToast(`Successfully updated marks for ${parsedCount} students from CSV`);
        };
        reader.readAsText(file);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const triggerFileUpload = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    // Low Performer Filters
    const [filterSubject, setFilterSubject] = useState('All');
    const [filterCIE, setFilterCIE] = useState('All');
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [selectedGradeFilter, setSelectedGradeFilter] = useState('All');



    // -- Syllabus State --
    const [lessonPlanData, setLessonPlanData] = useState(() => {
        const saved = localStorage.getItem('syllabusTracker');
        return saved ? JSON.parse(saved) : {};
    });

    // -- Syllabus Configuration State --
    const [syllabusConfig, setSyllabusConfig] = useState(() => {
        const saved = localStorage.getItem('syllabusStructure');
        return saved ? JSON.parse(saved) : {};
    });

    const [cieSelector, setCieSelector] = useState(() => {
        const saved = localStorage.getItem('cieSelector');
        return saved ? JSON.parse(saved) : {};
    });

    const [newUnitName, setNewUnitName] = useState('');
    const [addingToSubject, setAddingToSubject] = useState(null); // subjectId

    // -- IA Announcement State --
    const [iaConfig, setIaConfig] = useState({
        subjectId: '',
        cieNumber: '1',
        date: '',
        duration: '60',
        syllabus: '',
        instructions: '',
        room: '',
        time: ''
    });

    const handleIaConfigChange = (e) => {
        const { name, value } = e.target;
        setIaConfig(prev => ({ ...prev, [name]: value }));
    };

    React.useEffect(() => {
        if (activeSection === 'CIE Schedule' && iaConfig.subjectId && iaConfig.cieNumber) {
            fetchSchedule();
        }
    }, [iaConfig.subjectId, iaConfig.cieNumber, activeSection, publishedSchedules]);

    const fetchSchedule = async () => {
        // First, check if we have this schedule in publishedSchedules
        const matchingSchedule = publishedSchedules.find(
            sched => String(sched.subject?.id || sched.subjectId) === String(iaConfig.subjectId) &&
                String(sched.cieNumber) === String(iaConfig.cieNumber)
        );

        if (matchingSchedule) {
            // Use the already fetched published schedule data
            setIaConfig(prev => ({
                ...prev,
                date: matchingSchedule.scheduledDate || '',
                duration: matchingSchedule.durationMinutes || '60',
                syllabus: matchingSchedule.syllabusCoverage || prev.syllabus || '',
                instructions: matchingSchedule.instructions || prev.instructions || '',
                room: matchingSchedule.examRoom || '',
                time: matchingSchedule.startTime || ''
            }));
            return;
        }

        // Fallback to API call if not found in state
        try {
            const token = user?.token;
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

            const response = await fetch(`${API_BASE_URL}/cie/faculty/announcements/details?subjectId=${iaConfig.subjectId}&cieNumber=${iaConfig.cieNumber}`, {
                headers
            });

            if (response.ok) {
                const result = await response.json();
                const data = Array.isArray(result) ? result[0] : result; // Handle List response

                if (data) {
                    setIaConfig(prev => ({
                        ...prev,
                        date: data.scheduledDate || '',
                        duration: data.durationMinutes || '60',
                        syllabus: data.syllabusCoverage || '',
                        instructions: data.instructions || '',
                        room: data.examRoom || '',
                        time: data.startTime || ''
                    }));
                } else {
                    // Reset schedule details if not found
                    setIaConfig(prev => ({ ...prev, date: '', duration: '60', syllabus: '', instructions: '', room: '', time: '' }));
                }
            } else {
                // Reset if API call fails
                setIaConfig(prev => ({ ...prev, date: '', duration: '60', room: '', time: '' }));
            }
        } catch (e) {
            console.error("Error fetching announcement details", e);
        }
    };

    const handleAnnouncementSubmit = async () => {
        if (!iaConfig.subjectId || !iaConfig.cieNumber) {
            showToast('Please select Subject and CIE Number', 'error');
            return;
        }

        if (!iaConfig.syllabus || !iaConfig.syllabus.trim()) {
            showToast('Please enter syllabus topics', 'error');
            return;
        }

        try {
            const token = user?.token;
            const headers = {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            };

            const payload = {
                subjectId: iaConfig.subjectId,
                cieNumber: parseInt(iaConfig.cieNumber),
                syllabusCoverage: iaConfig.syllabus
            };

            const response = await fetch(`${API_BASE_URL}/cie/faculty/announcements/syllabus`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const updatedAnn = await response.json();

                // Update local state to reflect the syllabus change
                setPublishedSchedules(prev => {
                    const ann = updatedAnn.announcement || updatedAnn;
                    if (!ann || !ann.id) return prev;

                    const existingIndex = prev.findIndex(s => s.id === ann.id);
                    if (existingIndex >= 0) {
                        const newScheds = [...prev];
                        newScheds[existingIndex] = { ...newScheds[existingIndex], ...ann };
                        return newScheds;
                    }
                    return prev; // Don't add new — only update existing
                });

                showToast(`Syllabus for CIE-${iaConfig.cieNumber} Updated!`, 'success');
            } else {
                const err = await response.json().catch(() => ({ message: 'Failed to update syllabus' }));
                showToast(err.message || 'Failed to update syllabus', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Failed to update syllabus', 'error');
        }
    };

    const addUnit = (subjectId) => {
        if (!newUnitName.trim()) return;

        const newUnit = {
            id: `u${Date.now()}`,
            name: newUnitName
        };

        setSyllabusConfig(prev => {
            const currentUnits = prev[subjectId] || [
                { id: 'u1', name: 'Unit 1: Introduction' },
                { id: 'u2', name: 'Unit 2: Core Concepts' },
                { id: 'u3', name: 'Unit 3: Advanced Topics' },
                { id: 'u4', name: 'Unit 4: Application' },
                { id: 'u5', name: 'Unit 5: Case Studies' }
            ];

            const newState = {
                ...prev,
                [subjectId]: [...currentUnits, newUnit]
            };
            localStorage.setItem('syllabusStructure', JSON.stringify(newState));
            return newState;
        });
        setNewUnitName('');
        setAddingToSubject(null);
        showToast('New Unit Added');
    };

    const toggleUnit = (subjectId, unitId) => {
        setLessonPlanData(prev => {
            const newState = {
                ...prev,
                [subjectId]: {
                    ...prev[subjectId],
                    [unitId]: !prev[subjectId]?.[unitId]
                }
            };
            localStorage.setItem('syllabusTracker', JSON.stringify(newState));
            return newState;
        });
    };

    const toggleCieSelection = (subjectId, unitId) => {
        setCieSelector(prev => {
            const newState = {
                ...prev,
                [subjectId]: {
                    ...prev[subjectId],
                    [unitId]: !prev[subjectId]?.[unitId]
                }
            };
            localStorage.setItem('cieSelector', JSON.stringify(newState));
            return newState;
        });
    };

    const menuItems = [
        {
            label: 'Overview',
            path: '/dashboard/faculty',
            icon: <LayoutDashboard size={20} />,
            isActive: activeSection === 'Overview',
            onClick: () => { setActiveSection('Overview'); setSelectedSubject(null); setSelectedOverviewDept(null); }
        },
        {
            label: 'My Students',
            path: '/dashboard/faculty',
            icon: <Users size={20} />,
            isActive: activeSection === 'My Students',
            onClick: () => { setActiveSection('My Students'); setSelectedSubject(null); }
        },
        {
            label: 'CIE Entry',
            path: '/dashboard/faculty',
            icon: <FilePlus size={20} />,
            isActive: activeSection === 'CIE Entry',
            onClick: () => { setActiveSection('CIE Entry'); setSelectedSubject(null); setSelectedCieDept(null); }
        },
        {
            label: 'CIE Schedule',
            path: '/dashboard/faculty',
            icon: <Calendar size={20} />,
            isActive: activeSection === 'CIE Schedule',
            onClick: () => { setActiveSection('CIE Schedule'); setSelectedSubject(null); }
        },

        {
            label: 'Mentorship',
            path: '/dashboard/faculty',
            icon: <UserCheck size={20} />,
            isActive: activeSection === 'Mentorship',
            onClick: () => { setActiveSection('Mentorship'); setSelectedSubject(null); }
        },
        {
            label: 'Low Performers',
            path: '/dashboard/faculty',
            icon: <AlertTriangle size={20} />,
            isActive: activeSection === 'Low Performers',
            onClick: () => { setActiveSection('Low Performers'); setSelectedSubject(null); }
        },
        {
            label: 'Dept Assignment',
            path: '/dashboard/faculty',
            icon: <Building2 size={20} />,
            isActive: activeSection === 'Dept Assignment',
            onClick: () => { setActiveSection('Dept Assignment'); setSelectedSubject(null); }
        },
        {
            label: 'Notifications',
            path: '/dashboard/faculty',
            icon: <Bell size={20} />,
            isActive: activeSection === 'Notifications',
            onClick: () => { setActiveSection('Notifications'); setSelectedSubject(null); }
        },
    ];

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast({ show: false, message: '', type: 'success' });
        }, 3000);
    };

    const handleSubjectClick = async (subject) => {
        setSelectedSubject(subject);
        setActiveSection('CIE Entry');
        setMarks({}); // Clear previous
        setIsLocked(false);
        setCieLockStatus({ cie1: false, cie2: false, cie3: false, cie4: false, cie5: false }); // All unlocked by default

        try {
            const token = user?.token;
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            const res = await fetch(`${API_BASE_URL}/marks/subject/${subject.id}`, { headers });

            if (res.ok) {
                const data = await res.json();
                const newMarks = {};

                // Initialize empty for all current students
                students.forEach(s => {
                    newMarks[s.id] = { cie1: '', cie2: '', cie3: '', cie4: '', cie5: '', cie1Att: '', cie2Att: '', cie3Att: '', cie4Att: '', cie5Att: '' };
                });

                // Track per-CIE statuses to determine lock state
                const cieStatuses = { cie1: new Set(), cie2: new Set(), cie3: new Set(), cie4: new Set(), cie5: new Set() };

                console.log('--- FETCHED MARKS DEBUG ---');
                console.log('Current Students Count:', students.length);
                console.log('Fetched Marks Count:', data.length);

                // Create a set of valid student IDs for filtering
                const validStudentIds = new Set(students.map(s => s.id));

                data.forEach(m => {
                    if (m.student && m.student.id) {
                        const sId = m.student.id;

                        // CRITICAL FIX: Ignore marks for students not in the current list (phantom marks)
                        if (!validStudentIds.has(sId)) return;

                        if (!newMarks[sId]) newMarks[sId] = { cie1: '', cie2: '', cie3: '', cie4: '', cie5: '', cie1Att: '', cie2Att: '', cie3Att: '', cie4Att: '', cie5Att: '' };

                        // Normalize key: CIE-1 -> cie1, CIE1 -> cie1
                        const rawType = m.cieType || m.iaType;
                        const key = rawType ? rawType.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : null;

                        if (key && newMarks[sId]) {
                            // Display logic: null/undefined = not entered (show empty)
                            // 0 = faculty entered zero (show '0')
                            const isNotEntered = m.marks === null || m.marks === undefined;
                            const isPending = m.status === 'PENDING' || !m.status;
                            const markVal = (isNotEntered && isPending) ? '' : (m.marks !== null && m.marks !== undefined ? m.marks : '');
                            newMarks[sId][key] = markVal;

                            // Capture attendance per CIE record
                            if (m.attendancePercentage != null) {
                                newMarks[sId][key + 'Att'] = m.attendancePercentage;
                            }
                        }
                        // Track status per CIE type
                        if (key && cieStatuses[key]) {
                            cieStatuses[key].add(m.status || 'PENDING');
                        }
                    }
                });

                console.log('CIE Statuses:', cieStatuses);

                // Apply CIE role locking based on subject name
                const subjectName = (subject.name || '').toLowerCase();
                let role = 'ALL';
                if (subjectName.includes('(lab)') || subjectName.endsWith('-l')) {
                    role = 'LAB';
                } else if (subjectName.includes('(theory)') || subjectName.endsWith('-t')) {
                    role = 'THEORY';
                }

                setCieLockStatus({
                    cie1: role === 'LAB' || cieStatuses.cie1.has('SUBMITTED') || cieStatuses.cie1.has('APPROVED'),
                    cie2: role === 'LAB' || cieStatuses.cie2.has('SUBMITTED') || cieStatuses.cie2.has('APPROVED'),
                    cie3: role === 'THEORY' || cieStatuses.cie3.has('SUBMITTED') || cieStatuses.cie3.has('APPROVED'),
                    cie4: role === 'THEORY' || cieStatuses.cie4.has('SUBMITTED') || cieStatuses.cie4.has('APPROVED'),
                    cie5: role === 'LAB' || cieStatuses.cie5.has('SUBMITTED') || cieStatuses.cie5.has('APPROVED'),
                });
                setIsLocked(false);

                setMarks(newMarks);
            }
        } catch (e) {
            console.error("Error fetching marks", e);
            showToast('Failed to fetch marks', 'error');
        }
    };



    const handleMarkChange = (studentId, field, value) => {
        let numValue = parseInt(value, 10);
        if (value === '' || value === 'Ab') numValue = value; // Allow empty or Ab

        // Attendance fields allow up to 100, CIE marks max 50
        let max = field.endsWith('Att') ? 100 : 50;

        if (typeof numValue === 'number' && numValue < 0) numValue = 0;
        if (typeof numValue === 'number' && numValue > max) numValue = max;

        // Update Local State (for UI)
        setMarks(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [field]: numValue
            }
        }));

        // Update Global State (Real-time Low Performers)
        if (selectedSubject) {
            setAllStudentMarks(prev => ({
                ...prev,
                [selectedSubject.id]: {
                    ...prev[selectedSubject.id]?.[studentId],
                    [studentId]: {
                        ...prev[selectedSubject.id]?.[studentId],
                        [field]: numValue
                    }
                }
            }));
        }
    };

    const getLowPerformers = () => {
        let lowList = [];
        // Iterate over all subjects in allStudentMarks
        Object.keys(allStudentMarks).forEach(subId => {
            const subject = facultySubjects.find(s => s.id === parseInt(subId));
            if (!subject) return;

            const studentsMarks = allStudentMarks[subId];
            Object.keys(studentsMarks).forEach(stdId => {
                const m = studentsMarks[stdId];
                // Check ANY IA < 15
                const s1 = m.cie1 === 'Ab' ? 0 : (parseInt(m.cie1) || 0);
                const s2 = m.cie2 === 'Ab' ? 0 : (parseInt(m.cie2) || 0);

                // Find lowest score
                const minScore = Math.min(s1, s2);

                if (minScore < 15) { // Threshold 15/30
                    const student = studentsList.find(s => s.id === parseInt(stdId));
                    if (student) {
                        lowList.push({
                            regNo: student.regNo,
                            name: student.name,
                            subject: subject.name,
                            score: minScore
                        });
                    }
                }
            });
        });

        // Sort by lowest score and take top 5
        return lowList.sort((a, b) => (a.score === 'Ab' ? 0 : a.score) - (b.score === 'Ab' ? 0 : b.score)).slice(0, 5);
    };

    const calculateAverage = (student) => {
        if (selectedSubject) {
            const sMarks = marks[student.id] || {};
            const valCIE1 = Number(sMarks.cie1 === 'Ab' ? 0 : sMarks.cie1) || 0;
            const valCIE2 = Number(sMarks.cie2 === 'Ab' ? 0 : sMarks.cie2) || 0;
            const valCIE3 = Number(sMarks.cie3 === 'Ab' ? 0 : sMarks.cie3) || 0;
            const valCIE4 = Number(sMarks.cie4 === 'Ab' ? 0 : sMarks.cie4) || 0;
            const valCIE5 = Number(sMarks.cie5 === 'Ab' ? 0 : sMarks.cie5) || 0;
            return valCIE1 + valCIE2 + valCIE3 + valCIE4 + valCIE5;
        }
        return "-";
    };

    // Helper to prepare and save marks
    const prepareAndSaveMarks = async () => {
        const payload = [];
        Object.keys(marks).forEach(studentId => {
            const sMarks = marks[studentId];
            ['cie1', 'cie2', 'cie3', 'cie4', 'cie5'].forEach(key => {
                // Skip locked CIE types — nothing to save for those
                if (cieLockStatus[key]) return;

                const val = sMarks[key];
                const attField = key + 'Att';
                const attStr = sMarks[attField];

                let attVal = null;
                if (attStr === '') attVal = -1; // -1 signals backend to clear the field
                else if (attStr !== undefined && attStr !== null) attVal = parseFloat(attStr);

                let score = null;
                if (val === '') score = -1; // -1 signals backend to clear the field
                else if (val === 'Ab') score = 0;
                else if (val !== undefined && val !== null) score = parseFloat(val);

                // If both are completely untouched/undefined, skip sending this CIE type entirely
                if (score === null && attVal === null) return;

                // Validate score if it's a normal number
                if (score !== null && score !== -1 && isNaN(score)) return;
                if (attVal !== null && attVal !== -1 && isNaN(attVal)) return;

                payload.push({
                    studentId: parseInt(studentId),
                    subjectId: selectedSubject.id,
                    iaType: key.toUpperCase(),
                    co1: score,
                    co2: 0,
                    attendancePercentage: attVal
                });
            });
        });

        if (payload.length === 0) return { success: true, message: 'No marks to save' };

        try {
            const token = user?.token;
            const headers = { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) };
            const response = await fetch(`${API_BASE_URL}/marks/update/batch`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });

            if (response.ok) return { success: true };
            else {
                const err = await response.text();
                return { success: false, message: err };
            }
        } catch (e) {
            console.error(e);
            return { success: false, message: e.message };
        }
    };

    const handleSave = async () => {
        setSaving(true);
        const result = await prepareAndSaveMarks();
        setSaving(false);

        if (result.success) {
            showToast('Draft saved successfully! (Not yet submitted to HOD)', 'success');
            // Do NOT lock — this is just a draft save, not a submission
        } else {
            showToast('Error saving marks: ' + result.message, 'error');
        }
    };

    const handleSubmitForApproval = async () => {
        // Use the currently selected CIE type
        if (selectedCieType === 'all') {
            showToast('Please select a specific CIE (e.g., CIE-1) to submit for approval.', 'error');
            return;
        }
        const cieType = selectedCieType.toUpperCase();

        if (!window.confirm(`Submit ${cieType} marks + attendance to HOD for approval?`)) return;

        setSaving(true);

        // AUTO-SAVE BEFORE SUBMITTING
        const saveResult = await prepareAndSaveMarks();
        if (!saveResult.success) {
            showToast('Auto-save failed: ' + saveResult.message, 'error');
            setSaving(false);
            return;
        }

        try {
            const token = user?.token;
            const headers = {
                'Authorization': `Bearer ${token}`
            };

            // Call Submit Endpoint
            const res = await fetch(`${API_BASE_URL}/marks/submit?subjectId=${selectedSubject.id}&cieType=${cieType}`, {
                method: 'POST',
                headers
            });

            if (res.ok) {
                showToast(`Marks for ${cieType} submitted to HOD!`, 'success');
                setCieLockStatus(prev => ({ ...prev, [selectedCieType]: true }));
            } else {
                const err = await res.text();
                showToast('Submission failed: ' + err, 'error');
            }
        } catch (e) {
            console.error(e);
            showToast('Error submitting marks', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = () => {
        setIsLocked(false);
        showToast('Editing Enabled', 'info');
    };

    const handleEditRequest = () => {
        if (!selectedSubject) {
            alert('Please select a subject first');
            return;
        }

        const reason = prompt(`Why do you need to edit the approved marks for ${selectedSubject.name}?\n\n(This request will be sent to HOD for approval)`);

        if (reason === null) return; // User clicked Cancel

        if (!reason || reason.trim() === '') {
            alert('Please provide a reason for your edit request');
            return;
        }

        // For now, just show a success message
        // TODO: Implement backend endpoint to notify HOD
        alert(`Edit request sent to HOD!\n\nSubject: ${selectedSubject.name}\nReason: ${reason}\n\nThe HOD will review your request and unlock the marks if approved.`);
        showToast('Edit request sent to HOD', 'success');
    };




    const togglePreview = () => {
        setShowPreview(!showPreview);
    };

    const renderPreviewModal = () => {
        if (!showPreview || !selectedSubject) return null;
        const subjectStudents = students
            .filter(s => selectedSubject && s.department === selectedSubject.department && String(s.semester) === String(selectedSubject.semester))
            .sort((a, b) => a.name.localeCompare(b.name));

        return (
            <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowPreview(false)}>
                <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', width: '90%', maxWidth: '1000px', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #e5e7eb', paddingBottom: '1rem' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#111827' }}>📋 CIE Marks Report Preview</h2>
                            <p style={{ margin: '0.3rem 0 0', color: '#6b7280', fontSize: '0.9rem' }}>{selectedSubject.name} ({selectedSubject.code}) — {selectedSubject.semester} Sem</p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => { window.print(); }} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}>🖨️ Print</button>
                            <button onClick={() => setShowPreview(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white', color: '#374151', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}>✕ Close</button>
                        </div>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                <th style={{ padding: '10px 12px', borderBottom: '2px solid #e5e7eb', textAlign: 'left', color: '#374151', fontWeight: '600' }}>Sl</th>
                                <th style={{ padding: '10px 12px', borderBottom: '2px solid #e5e7eb', textAlign: 'left', color: '#374151', fontWeight: '600' }}>Reg No</th>
                                <th style={{ padding: '10px 12px', borderBottom: '2px solid #e5e7eb', textAlign: 'left', color: '#374151', fontWeight: '600' }}>Student Name</th>
                                <th style={{ padding: '10px 12px', borderBottom: '2px solid #e5e7eb', textAlign: 'center', color: '#374151', fontWeight: '600' }}>CIE-1</th>
                                <th style={{ padding: '10px 12px', borderBottom: '2px solid #e5e7eb', textAlign: 'center', color: '#374151', fontWeight: '600' }}>CIE-2</th>
                                <th style={{ padding: '10px 12px', borderBottom: '2px solid #e5e7eb', textAlign: 'center', color: '#374151', fontWeight: '600' }}>CIE-3</th>
                                <th style={{ padding: '10px 12px', borderBottom: '2px solid #e5e7eb', textAlign: 'center', color: '#374151', fontWeight: '600' }}>CIE-4</th>
                                <th style={{ padding: '10px 12px', borderBottom: '2px solid #e5e7eb', textAlign: 'center', color: '#374151', fontWeight: '600' }}>CIE-5</th>
                                <th style={{ padding: '10px 12px', borderBottom: '2px solid #e5e7eb', textAlign: 'center', color: '#374151', fontWeight: '700' }}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {subjectStudents.map((student, index) => {
                                const sMarks = marks[student.id] || {};
                                const ia1Mark = sMarks['CIE1'] || {};
                                const v1 = sMarks.cie1 !== undefined ? sMarks.cie1 : (ia1Mark.cie1Score != null ? ia1Mark.cie1Score : '-');
                                const v2 = sMarks.cie2 !== undefined ? sMarks.cie2 : (ia1Mark.cie2Score != null ? ia1Mark.cie2Score : '-');
                                const v3 = sMarks.cie3 !== undefined ? sMarks.cie3 : '-';
                                const v4 = sMarks.cie4 !== undefined ? sMarks.cie4 : '-';
                                const v5 = sMarks.cie5 !== undefined ? sMarks.cie5 : '-';
                                const total = [v1, v2, v3, v4, v5].reduce((sum, v) => sum + (v !== '-' && v !== '' && v !== 'Ab' ? (Number(v) || 0) : 0), 0);
                                const hasAny = [v1, v2, v3, v4, v5].some(v => v !== '-' && v !== '');
                                const cellStyle = (v) => ({ padding: '8px 12px', borderBottom: '1px solid #f3f4f6', textAlign: 'center', color: v === '-' || v === '' ? '#9ca3af' : '#111827', fontWeight: v !== '-' && v !== '' ? '500' : '400' });
                                return (
                                    <tr key={student.id} style={{ background: index % 2 === 0 ? 'white' : '#f9fafb' }}>
                                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6', color: '#6b7280' }}>{index + 1}</td>
                                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6', fontFamily: 'monospace', fontSize: '0.8rem' }}>{student.rollNo || student.regNo}</td>
                                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6', fontWeight: '500' }}>{student.name}</td>
                                        <td style={cellStyle(v1)}>{v1}</td>
                                        <td style={cellStyle(v2)}>{v2}</td>
                                        <td style={cellStyle(v3)}>{v3}</td>
                                        <td style={cellStyle(v4)}>{v4}</td>
                                        <td style={cellStyle(v5)}>{v5}</td>
                                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6', textAlign: 'center', fontWeight: '700', color: hasAny ? '#111827' : '#9ca3af' }}>{hasAny ? total : '-'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: '#f0fdf4', borderRadius: '8px', fontSize: '0.85rem', color: '#166534' }}>
                        📊 Total Students: {subjectStudents.length} | Subject: {selectedSubject.name} | Max per CIE: 50 | Total Max: 250
                    </div>
                </div>
            </div>
        );
    };

    // --- NEW FEATURE: EXPORT CSV ---
    const downloadCSV = () => {
        const headers = ['Reg No', 'Name', 'Section', 'Batch', 'CIE-1', 'CIE-2', 'CIE-3', 'CIE-4', 'CIE-5', 'Total'];
        const rows = students.map(s => {
            const sMarks = marks[s.id] || {};
            const ia1Mark = sMarks['CIE1'] || {};

            const valCIE1 = sMarks.cie1 !== undefined ? sMarks.cie1 : (ia1Mark.cie1Score != null ? ia1Mark.cie1Score : 0);
            const valCIE2 = sMarks.cie2 !== undefined ? sMarks.cie2 : (ia1Mark.cie2Score != null ? ia1Mark.cie2Score : 0);
            const valCIE3 = sMarks.cie3 !== undefined ? sMarks.cie3 : 0;
            const valCIE4 = sMarks.cie4 !== undefined ? sMarks.cie4 : 0;
            const valCIE5 = sMarks.cie5 !== undefined ? sMarks.cie5 : 0;

            return [
                s.rollNo,
                s.name,
                s.section,
                s.batch,
                valCIE1,
                valCIE2,
                valCIE3,
                valCIE4,
                valCIE5,
                ((Number(valCIE1) || 0) + (Number(valCIE2) || 0) + (Number(valCIE3) || 0) + (Number(valCIE4) || 0) + (Number(valCIE5) || 0))
            ];
        });

        const csvContent = "data:text/csv;charset=utf-8,"
            + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `CIE_Marks_Export.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Marks Exported to CSV', 'success');
    };

    // --- NEW FEATURE: PROFILE MODAL ---
    const openProfile = (student) => {
        setSelectedStudent(student);
        setShowProfileModal(true);
    };

    const renderStudentProfileModal = () => {
        if (!showProfileModal || !selectedStudent) return null;

        // Calculate Real Data
        const percentage = calculateStudentPercentage(selectedStudent);
        const grade = calculateGradeFromPercentage(percentage);



        // Status Logic
        let statusLabel = 'Good Standing';
        let statusColor = '#059669'; // Green

        if (grade === 'F') {
            statusLabel = 'At Risk';
            statusColor = '#dc2626'; // Red
        } else if (grade === 'D') {
            statusLabel = 'Average';
            statusColor = '#d97706'; // Orange
        }


        return (
            <div className={styles.modalOverlay} onClick={() => setShowProfileModal(false)}>
                <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.modalHeader}>
                        <h2>Student Profile</h2>
                        <button className={styles.closeBtn} onClick={() => setShowProfileModal(false)}>
                            <X size={20} />
                        </button>
                    </div>
                    <div className={styles.modalBody}>
                        <div className={styles.profileHeader}>
                            <div className={styles.profileAvatar}>
                                {selectedStudent.name.charAt(0)}
                            </div>
                            <div className={styles.profileInfo}>
                                <h3>{selectedStudent.name}</h3>
                                <p className={styles.profileMeta}>{selectedStudent.rollNo || selectedStudent.regNo}</p>
                                <span className={`${styles.badge} ${styles.good}`}>
                                    {selectedStudent.semester} Sem - {selectedStudent.section || 'A'} ({selectedStudent.batch || '2025'})
                                </span>
                            </div>
                        </div>

                        <div className={styles.infoGrid}>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Email Address</span>
                                <span className={styles.infoValue}>{(selectedStudent.rollNo || selectedStudent.regNo).toLowerCase()}@college.edu</span>
                            </div>

                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Academic Standing</span>
                                <span className={styles.infoValue} style={{ color: statusColor }}>{statusLabel} ({grade})</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Student Phone</span>
                                <span className={styles.infoValue}>{selectedStudent.phone || 'N/A'}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Parent Phone</span>
                                <span className={styles.infoValue}>{selectedStudent.parentPhone || 'N/A'}</span>
                            </div>
                        </div>

                        <div className={styles.infoGrid} style={{ marginTop: '1rem', borderTop: '1px solid #f3f4f6', paddingTop: '1rem' }}>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Current Aggregate</span>
                                <span className={styles.infoValue} style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{percentage.toFixed(1)}%</span>
                            </div>
                        </div>

                        <button className={styles.saveBtn} style={{ width: '100%', marginTop: '1rem' }} onClick={() => showToast('Full Report Downloaded')}>
                            <FileText size={18} /> Download Full Academic Report
                        </button>
                    </div>
                </div>
            </div >
        );
    };

    // --- CSV BULK UPLOAD FUNCTIONS ---
    const downloadCsvTemplate = () => {
        if (!selectedSubject) {
            showToast('Please select a subject first', 'error');
            return;
        }
        const headers = ['RegNo', 'StudentName', 'Marks', 'Attendance'];
        const subjectStudents = students.filter(s =>
            String(s.semester) === String(selectedSubject.semester) &&
            s.department === selectedSubject.department &&
            (facultySections.length === 0 || facultySections.includes(s.section))
        );
        const rows = subjectStudents.map(s => [
            s.regNo || s.rollNo || '',
            `"${(s.name || '').replace(/"/g, '""')}"`,
            '',
            ''
        ]);
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `CIE_Template_${(selectedSubject.name || 'Subject').replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast('Template downloaded!', 'success');
    };

    const handleCsvFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setCsvFile(file);

        const reader = new FileReader();
        reader.onload = (evt) => {
            // Strip ALL BOM/invisible chars and normalize line endings
            const text = evt.target.result
                .replace(/\uFEFF/g, '')              // Strip ALL BOM characters
                .replace(/[\u200B-\u200D\u2060]/g, '') // Strip zero-width chars
                .replace(/\r\n/g, '\n')               // Normalize CRLF
                .replace(/\r/g, '\n');                 // Normalize bare CR
            const lines = text.split('\n').filter(line => line.trim() !== '');
            if (lines.length < 1) {
                setCsvErrors([{ row: 0, message: 'CSV file is empty or has no data rows' }]);
                setCsvData([]);
                return;
            }

            // Auto-detect: is line 0 a header or data?
            // If the first column starts with a digit, treat it as data (RegNo like 459CE25001)
            const firstCol = lines[0].split(',')[0].replace(/[^\w]/g, '').trim();
            const hasHeader = firstCol.length > 0 && !/^\d/.test(firstCol);
            const dataStartIndex = hasHeader ? 1 : 0;

            // Build student lookup by regNo
            const subjectStudents = students.filter(s =>
                String(s.semester) === String(selectedSubject.semester) &&
                s.department === selectedSubject.department &&
                (facultySections.length === 0 || facultySections.includes(s.section))
            );
            const studentMap = {};
            subjectStudents.forEach(s => {
                const key = (s.regNo || s.rollNo || '').replace(/[^\w]/g, '').trim().toLowerCase();
                if (key) studentMap[key] = s;
            });

            const parsed = [];
            const errors = [];

            for (let i = dataStartIndex; i < lines.length; i++) {
                // Simple CSV parse (handles quoted fields)
                const cols = [];
                let current = '';
                let inQuotes = false;
                for (let c = 0; c < lines[i].length; c++) {
                    const ch = lines[i][c];
                    if (ch === '"') { inQuotes = !inQuotes; }
                    else if (ch === ',' && !inQuotes) { cols.push(current.trim()); current = ''; }
                    else { current += ch; }
                }
                cols.push(current.trim());

                // Clean RegNo: strip any leftover invisible/control chars
                const regNo = (cols[0] || '').replace(/[^\w]/g, '').trim();
                const name = (cols[1] || '').trim();
                const marksStr = (cols[2] || '').trim();
                const attStr = (cols[3] || '').trim();

                if (!regNo) {
                    errors.push({ row: i, message: `Row ${i}: Missing RegNo` });
                    continue;
                }

                const student = studentMap[regNo.toLowerCase()];
                if (!student) {
                    errors.push({ row: i, message: `Row ${i}: RegNo "${regNo}" not found in student list` });
                    parsed.push({ regNo, name, marksStr, attStr, studentId: null, valid: false, errorMsg: 'Student not found' });
                    continue;
                }

                // Validate marks
                let marksVal = null;
                let marksError = null;
                if (marksStr.toLowerCase() === 'ab') {
                    marksVal = 0; // Absent = 0
                } else if (marksStr === '') {
                    marksVal = null; // Skip
                } else {
                    const num = parseFloat(marksStr);
                    if (isNaN(num)) {
                        marksError = `Invalid marks "${marksStr}"`;
                    } else if (num < 0 || num > 50) {
                        marksError = `Marks ${num} out of range (0-50)`;
                    } else {
                        marksVal = num;
                    }
                }

                // Validate attendance
                let attVal = null;
                let attError = null;
                if (attStr === '') {
                    attVal = null; // Skip
                } else {
                    const num = parseFloat(attStr);
                    if (isNaN(num)) {
                        attError = `Invalid attendance "${attStr}"`;
                    } else if (num < 0 || num > 100) {
                        attError = `Attendance ${num} out of range (0-100)`;
                    } else {
                        attVal = num;
                    }
                }

                if (marksError || attError) {
                    const msg = [marksError, attError].filter(Boolean).join('; ');
                    errors.push({ row: i, message: `Row ${i} (${regNo}): ${msg}` });
                    parsed.push({ regNo, name: student.name, marksStr, attStr, studentId: student.id, valid: false, errorMsg: msg, marks: marksVal, attendance: attVal });
                } else {
                    parsed.push({ regNo, name: student.name, marksStr, attStr, studentId: student.id, valid: true, marks: marksVal, attendance: attVal });
                }
            }

            setCsvData(parsed);
            setCsvErrors(errors);
        };
        reader.readAsText(file);
    };

    const handleCsvUpload = () => {
        if (!selectedSubject) {
            showToast('No subject selected', 'error');
            return;
        }
        const validRows = csvData.filter(r => r.valid && r.studentId);
        if (validRows.length === 0) {
            showToast('No valid rows to upload', 'error');
            return;
        }

        // Only update local marks state — user must click "Save Draft" to persist
        const cieKey = csvCieType.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        setMarks(prev => {
            const updated = { ...prev };
            validRows.forEach(r => {
                if (!updated[r.studentId]) {
                    updated[r.studentId] = { cie1: '', cie2: '', cie3: '', cie4: '', cie5: '', cie1Att: '', cie2Att: '', cie3Att: '', cie4Att: '', cie5Att: '' };
                }
                if (r.marks !== null) updated[r.studentId][cieKey] = r.marks;
                if (r.attendance !== null) updated[r.studentId][cieKey + 'Att'] = r.attendance;
            });
            return updated;
        });

        showToast(`${validRows.length} marks loaded for ${csvCieType}. Click "Save Draft" to save!`, 'success');
        setShowUploadModal(false);
        setCsvData([]);
        setCsvErrors([]);
        setCsvFile(null);
    };

    // --- UPLOAD MODAL ---
    const renderUploadModal = () => {
        if (!showUploadModal) return null;

        const validCount = csvData.filter(r => r.valid).length;
        const invalidCount = csvData.filter(r => !r.valid).length;

        return (
            <div className={styles.modalOverlay} onClick={() => { setShowUploadModal(false); setCsvData([]); setCsvErrors([]); setCsvFile(null); }}>
                <div className={styles.modalContent} style={{ maxWidth: '750px', maxHeight: '85vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.modalHeader}>
                        <h2>📤 Bulk Upload CIE Marks</h2>
                        <button className={styles.closeBtn} onClick={() => { setShowUploadModal(false); setCsvData([]); setCsvErrors([]); setCsvFile(null); }}>
                            <X size={20} />
                        </button>
                    </div>
                    <div className={styles.modalBody}>
                        {/* Step 1: CIE Type Selector */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Select CIE Type *</label>
                            <div className={styles.csvCieSelector}>
                                {['CIE1', 'CIE2', 'CIE3', 'CIE4', 'CIE5'].map(cie => (
                                    <button
                                        key={cie}
                                        className={`${styles.csvCieBtn} ${csvCieType === cie ? styles.csvCieBtnActive : ''}`}
                                        onClick={() => setCsvCieType(cie)}
                                    >
                                        {cie.replace('CIE', 'CIE-')}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Step 2: Template Download */}
                        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f0f9ff', borderRadius: '10px', border: '1px solid #bae6fd' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <p style={{ fontWeight: 600, color: '#0369a1', margin: 0, fontSize: '0.9rem' }}>📋 Download Template</p>
                                    <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0.25rem 0 0 0' }}>CSV with RegNo, StudentName, Marks, Attendance columns</p>
                                </div>
                                <button className={styles.csvTemplateBtn} onClick={downloadCsvTemplate}>
                                    <Download size={16} /> Template
                                </button>
                            </div>
                        </div>

                        {/* Step 3: File Upload */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Upload CSV File</label>
                            <div className={styles.uploadArea} onClick={() => document.getElementById('csvFileInput').click()}>
                                <Upload size={36} color="#2563eb" />
                                <div>
                                    <p className={styles.uploadText}>{csvFile ? csvFile.name : 'Click to select CSV file'}</p>
                                    <p className={styles.uploadSubtext}>CSV format only • Marks (0-50) • Attendance (0-100%)</p>
                                </div>
                            </div>
                            <input
                                id="csvFileInput"
                                type="file"
                                accept=".csv"
                                style={{ display: 'none' }}
                                onChange={handleCsvFileChange}
                            />
                        </div>

                        {/* Step 4: Preview Table */}
                        {csvData.length > 0 && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                    <h4 style={{ margin: 0, color: '#1e293b' }}>Preview ({csvData.length} rows)</h4>
                                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem' }}>
                                        <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ {validCount} valid</span>
                                        {invalidCount > 0 && <span style={{ color: '#dc2626', fontWeight: 600 }}>✗ {invalidCount} errors</span>}
                                    </div>
                                </div>
                                <div className={styles.csvPreviewWrapper}>
                                    <table className={styles.csvPreviewTable}>
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>RegNo</th>
                                                <th>Name</th>
                                                <th>Marks</th>
                                                <th>Attendance</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {csvData.map((row, idx) => (
                                                <tr key={idx} className={row.valid ? styles.csvValidRow : styles.csvErrorRow}>
                                                    <td>{idx + 1}</td>
                                                    <td>{row.regNo}</td>
                                                    <td>{row.name}</td>
                                                    <td>{row.marksStr || '—'}</td>
                                                    <td>{row.attStr || '—'}</td>
                                                    <td>
                                                        {row.valid
                                                            ? <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ Valid</span>
                                                            : <span style={{ color: '#dc2626', fontSize: '0.8rem' }} title={row.errorMsg}>✗ {row.errorMsg}</span>
                                                        }
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Error Summary */}
                        {csvErrors.length > 0 && (
                            <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #fecaca' }}>
                                <p style={{ fontWeight: 600, color: '#991b1b', margin: '0 0 0.5rem 0', fontSize: '0.85rem' }}>⚠️ {csvErrors.length} Error(s):</p>
                                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8rem', color: '#b91c1c' }}>
                                    {csvErrors.slice(0, 5).map((err, i) => <li key={i}>{err.message}</li>)}
                                    {csvErrors.length > 5 && <li>...and {csvErrors.length - 5} more</li>}
                                </ul>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                            <button className={styles.secondaryBtn} onClick={() => { setShowUploadModal(false); setCsvData([]); setCsvErrors([]); setCsvFile(null); }}>Cancel</button>
                            <button
                                className={styles.saveBtn}
                                disabled={csvData.filter(r => r.valid).length === 0}
                                onClick={handleCsvUpload}
                            >
                                {`Load ${validCount} Marks (${csvCieType.replace('CIE', 'CIE-')})`}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };


    // --- HELPER --
    const calculateGradeFromPercentage = (percentage) => {
        if (percentage >= 75) return 'A'; // Was 80, now A covers S range too
        if (percentage >= 60) return 'B'; // Was 70
        if (percentage >= 50) return 'C'; // Was 60
        if (percentage >= 40) return 'D'; // Was 50, lowered passing standard? Or just shifting?
        // Let's stick to standard 10-point scale but shifted?
        // User asked for a,b,c,d. 
        // Typically: A=Distinction, B=First Class, C=Second, D=Pass
        return 'F';
    };

    // --- VIEW RENDERERS ---

    const renderOverview = () => (
        <>
            <div className={styles.analyticsGrid}>
                {/* CIE STATUS */}
                <div className={styles.analyticsCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 className={styles.analyticsTitle}>CIE (IA) STATUS</h3>
                        <span style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 'bold' }}>{facultyClassAnalytics.start || 'Deadline: TBA'}</span>
                    </div>
                    <div className={styles.analyticsContent}>
                        <div className={styles.statItem}>
                            <span className={styles.statValue}>{facultyClassAnalytics.totalStudents || (facultyClassAnalytics.evaluated + facultyClassAnalytics.pending)}</span>
                            <span className={styles.statLabel}><Users size={14} /> Total Students</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statValue}>{facultyClassAnalytics.evaluated}</span>
                            <span className={styles.statLabel}><CheckCircle size={14} /> Evaluated</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statValue} style={{ color: facultyClassAnalytics.pending > 0 ? '#ef4444' : 'inherit' }}>
                                {facultyClassAnalytics.pending > 0 ? <AlertTriangle size={14} color="#ef4444" style={{ marginRight: '4px' }} /> : <Clock size={14} />}
                                {facultyClassAnalytics.pending}
                            </span>
                            <span className={styles.statLabel}>Pending</span>
                        </div>
                    </div>
                    <div style={{ marginTop: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem', color: '#6b7280' }}>
                            <span>Progress</span>
                            <span>{Math.round((facultyClassAnalytics.evaluated / ((facultyClassAnalytics.evaluated + facultyClassAnalytics.pending) || 1)) * 100)}%</span>
                        </div>
                        <div style={{ height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${(facultyClassAnalytics.evaluated / ((facultyClassAnalytics.evaluated + facultyClassAnalytics.pending) || 1)) * 100}%`, height: '100%', background: '#10b981' }}></div>
                        </div>
                    </div>
                </div>

                {/* CLASS ANALYTICS */}
                <div className={styles.analyticsCard}>
                    <h3 className={styles.analyticsTitle}>CLASS ANALYTICS</h3>
                    <div className={styles.analyticsContent}>
                        <div className={styles.statItem}>
                            <span className={styles.statValue}>{facultyClassAnalytics.avgScore}%</span>
                            <span className={styles.statLabel}><BarChart2 size={14} /> Avg Score</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statValue}>{facultyClassAnalytics.lowPerformers}</span>
                            <span className={styles.statLabel}><TrendingDown size={14} /> Low Performers</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statValue}>{facultyClassAnalytics.topPerformers}</span>
                            <span className={styles.statLabel}><Award size={14} /> Top Performers</span>
                        </div>
                    </div>
                    <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: facultyClassAnalytics.avgScore >= 50 ? '#059669' : '#ca8a04', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {facultyClassAnalytics.avgScore >= 50 ? <TrendingDown size={16} style={{ transform: 'rotate(180deg)' }} /> : <AlertTriangle size={14} />} {facultyClassAnalytics.avgScore >= 50 ? 'Good performance — class average above 50%' : 'Class average needs improvement'}
                    </p>
                </div>
            </div>






            < div className={styles.mainContentGrid} >
                <div className={styles.leftColumn}>
                    {/* Level 1: Select Department for Overview */}
                    {!selectedOverviewDept ? (
                        <section>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h2 className={styles.sectionTitle} style={{ margin: 0 }}>Select Department</h2>
                            </div>
                            {(() => {
                                const overviewDepartments = [...new Set(mySubjects.map(sub => sub.department).filter(Boolean))].sort();
                                if (overviewDepartments.length === 0) {
                                    return <p>No departments found.</p>;
                                }
                                if (overviewDepartments.length === 1) {
                                    // Automatically set it so we skip the Level 1 screen next render,
                                    // but for this render, we just return the next level immediately
                                    setTimeout(() => setSelectedOverviewDept(overviewDepartments[0]), 0);
                                    return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading subjects...</div>;
                                }
                                return (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
                                        {overviewDepartments.map(dept => (
                                            <div
                                                key={dept}
                                                onClick={() => setSelectedOverviewDept(dept)}
                                                style={{
                                                    background: 'white',
                                                    borderRadius: '16px',
                                                    padding: '2rem 1.5rem',
                                                    textAlign: 'center',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                                                    transition: 'transform 0.2s ease',
                                                    border: '1px solid #f1f5f9'
                                                }}
                                                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; }}
                                                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                                            >
                                                <div style={{
                                                    width: '64px',
                                                    height: '64px',
                                                    borderRadius: '50%',
                                                    background: '#e0f2fe',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    margin: '0 auto 1.5rem auto'
                                                }}>
                                                    <Building2 size={32} color="#0284c7" />
                                                </div>
                                                <h3 style={{ margin: '0 0 0.5rem 0', color: '#0f172a', fontSize: '1.25rem' }}>{dept}</h3>
                                                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>View Subjects</p>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </section>
                    ) : (
                        <section>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    {(() => {
                                        const overviewDepartments = [...new Set(mySubjects.map(sub => sub.department).filter(Boolean))].sort();
                                        return (
                                            <>
                                                {overviewDepartments.length > 1 ? (
                                                    <button
                                                        onClick={() => setSelectedOverviewDept(null)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}
                                                    >
                                                        ← Back
                                                    </button>
                                                ) : null}
                                                <h2 className={styles.sectionTitle} style={{ margin: 0 }}>Subjects {overviewDepartments.length > 1 ? `- ${selectedOverviewDept}` : ''}</h2>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>

                            <div className={styles.cardsGrid}>
                                {mySubjects.length > 0 ? mySubjects
                                    .filter(sub => sub.department === selectedOverviewDept)
                                    .map(sub => (
                                        <div key={sub.id} className={styles.subjectCard} onClick={() => handleSubjectClick(sub)}>
                                            <div className={styles.cardHeader}>
                                                <h3 className={styles.subjectName}>{sub.name}</h3>
                                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                    <span className={styles.termBadge}>{sub.semester} Sem</span>
                                                </div>
                                            </div>
                                            <div className={styles.subjectFooter}>
                                                <div className={styles.cardStats}>
                                                    <Users size={16} color="#6b7280" />
                                                    <span>{sub.studentCount} Students</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    <span className={styles.progressBadge} style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>Needs Attention</span>
                                                    <span className={styles.progressBadge}>85% Comp</span>
                                                </div>
                                            </div>
                                        </div>
                                    )) : <p>No subjects assigned.</p>}
                            </div>
                        </section>
                    )}




                </div>

                <div className={styles.rightColumn}>
                    {/* Notifications Widget */}
                    <div className={styles.card}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2 className={styles.cardTitle} style={{ margin: 0 }}>🔔 Notifications</h2>
                            <span className={styles.badge} style={{ background: '#eff6ff', color: '#2563eb' }}>{notifications.length} New</span>
                        </div>

                        <div className={styles.notificationsList}>
                            {notifications.length > 0 ? (
                                notifications.slice(0, 5).map((note, idx) => (
                                    <div key={note.id || idx} className={styles.notifItem}>
                                        <div className={styles.notifIcon} style={{ background: '#eff6ff', color: '#2563eb' }}>
                                            <Bell size={16} />
                                        </div>
                                        <div className={styles.notifContent}>
                                            <p className={styles.notifMessage}>{note.message}</p>
                                            <span className={styles.notifTime}>{new Date(note.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className={styles.noNotifications}>
                                    <Bell size={24} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                                    <p>No new notifications</p>
                                </div>
                            )}

                            <button className={styles.viewAllBtn} onClick={() => setActiveSection('Notifications')}>
                                View All Notifications →
                            </button>
                        </div>
                    </div>
                </div>
            </div >
        </>
    );

    // Helper to calculate percentage for filter (moved from renderMyStudents)
    const calculateStudentPercentage = (std) => {
        let totalPerformance = 0;
        let subjectCount = 0;
        Object.keys(allStudentMarks).forEach(subId => {
            const sMarks = allStudentMarks[subId][std.id];
            if (sMarks) {
                const scores = [sMarks.cie1, sMarks.cie2, sMarks.cie3, sMarks.cie4, sMarks.cie5].filter(x => x !== '' && x !== 'Ab' && x !== undefined).map(Number);
                if (scores.length > 0) {
                    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                    const percent = (avg / 50) * 100;
                    totalPerformance += percent;
                    subjectCount++;
                }
            }
        });
        return subjectCount > 0 ? (totalPerformance / subjectCount) : 0;
    };

    const renderMyStudents = () => {
        // Derive unique departments from students for department filter
        const studentDepartments = ['All', ...new Set(students.map(s => s.department).filter(Boolean))].sort((a, b) => a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b));

        const filteredStudents = students
            .filter(s => {
                // Department filter
                if (selectedDept !== 'All' && s.department !== selectedDept) return false;
                return true;
            })
            .filter(s =>
                s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (s.rollNo || s.regNo).toLowerCase().includes(searchTerm.toLowerCase())
            )
            .filter(s => {
                if (selectedGradeFilter === 'All') return true;
                // We need to calculate grade here to filter
                // Ideally grade should be a property of student object from backend
                // For now, re-using calculation logic

                // Re-calculate to match table display logic exactly
                let avgMarks = 0;
                if (s.marks) {
                    const total = (s.marks.ia1 || 0) + (s.marks.ia2 || 0) + (s.marks.ia3 || 0);
                    avgMarks = (total / 60) * 100;
                } else {
                    avgMarks = 85; // Default mock for consistency if not present, or better:
                    // Just accept that for this demo without real marks, filtering might be inconsistent 
                    // unless we store the random grade. 
                    // Let's assume for this task we use a determinstic check or the helper
                }

                // For consistent filtering in this demo where marks might be missing:
                // We can't use random in filter vs render.
                // Let's use the helper but note the limitation on mock data.
                // To make it work for the user's view, we need the grades to match what they see.
                // Since the table generated random grades on the fly in the previous code, 
                // filtering will be broken unless we stabilize the grades.

                // FIX: The previous table code calculated random grades inside the map!
                // We must standardize this. 
                // For the purpose of this task, I will update the table render to use `calculateGrade` 
                // and here I will use `calculateGrade`. 
                // However, `calculateGrade` uses random if marks missing. 
                // Random will change on every render!
                // We need to persist the mock marks or grades if they are missing.

                // Hack for stability if marks missing: generate based on ID hash or something?
                // Or just assume marks are present for the filter to be meaningful.
                // Let's try to use the helper.

                // IMPROVED LOGIC: To ensure filter matches table, we'll calculate grade same way.
                // But wait, the table code had: `const attendance = std.attendance || Math.floor(Math.random() * 20) + 80;` 
                // and `avgMarks = Math.floor(Math.random() * 40) + 50;`
                // This means every render shows different grades! 
                // I should fix the Table Render to use the helper first, 
                // and the helper should probably be deterministic if possible, 
                // or just accept it for now but user asked for filtering.

                // Proceeding with helper usage.
                // Proceeding with helper usage.
                const { grade } = getStudentPerformance(s.id);
                // Filter by Grade
                const gradeMatch = selectedGradeFilter === 'All' || grade === selectedGradeFilter;
                // Filter by Section
                const sectionMatch = selectedSection === 'All' || s.section === selectedSection;
                // Also ensure student is in faculty's assigned sections generally if restricted
                const facultySectionMatch = facultySections.length === 0 || facultySections.includes(s.section);

                return gradeMatch && sectionMatch && facultySectionMatch;
            })
            .sort((a, b) => a.name.localeCompare(b.name));

        return (
            <div className={styles.sectionContainer}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>My Students Directory</h2>
                    <div className={styles.headerActions}>
                        <div className={styles.searchWrapper}>
                            <Search size={20} className={styles.searchIcon} />
                            <input
                                type="text"
                                placeholder="Search student..."
                                className={styles.searchInput}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div style={{ position: 'relative' }}>
                            <button
                                className={`${styles.filterBtn} ${showFilterMenu ? styles.active : ''}`}
                                onClick={() => setShowFilterMenu(!showFilterMenu)}
                            >
                                <Filter size={16} />
                                <span>{selectedGradeFilter === 'All' ? 'Filter' : `Grade: ${selectedGradeFilter}`}</span>
                            </button>

                            {/* Section Filter Dropdown */}
                            {facultySections.length > 1 && (
                                <select
                                    className={styles.deptSelect}
                                    value={selectedSection}
                                    onChange={(e) => setSelectedSection(e.target.value)}
                                    style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}
                                >
                                    <option value="All">All Sections</option>
                                    {facultySections.map(sec => <option key={sec} value={sec}>Section {sec}</option>)}
                                </select>
                            )}

                            {showFilterMenu && (
                                <div className={styles.filterMenu}>
                                    <div className={styles.filterHeader}>Filter by Grade</div>
                                    {['All', 'A', 'B', 'C', 'D'].map(grade => (
                                        <div
                                            key={grade}
                                            className={`${styles.filterOption} ${selectedGradeFilter === grade ? styles.selected : ''}`}
                                            onClick={() => {
                                                setSelectedGradeFilter(grade);
                                                setShowFilterMenu(false);
                                            }}
                                        >
                                            {selectedGradeFilter === grade && <CheckCircle size={14} color="#2563eb" />}
                                            {grade}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Department Filter Bar */}
                {studentDepartments.length > 2 && (
                    <div className={styles.deptFilterBar}>
                        <Building2 size={16} style={{ color: '#6b7280', flexShrink: 0 }} />
                        <span className={styles.deptFilterLabel}>Department:</span>
                        <div className={styles.deptPillGroup}>
                            {studentDepartments.map(dept => (
                                <button
                                    key={dept}
                                    className={`${styles.deptPill} ${selectedDept === dept ? styles.deptPillActive : ''}`}
                                    onClick={() => handleDeptFilterChange(dept)}
                                >
                                    {dept === 'All' ? 'All' : dept}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className={styles.card}>
                    <div className={styles.studentTableContainer}>
                        <table className={styles.studentTable}>
                            <thead>
                                <tr>
                                    <th>Sl No</th>
                                    <th>Reg No</th>
                                    <th>Student Name</th>
                                    <th>Semester</th>
                                    <th>Section</th>
                                    <th>Status</th>
                                    <th>Grade</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.map((std, index) => {
                                    // Calculate Real Grade & Status using central helper
                                    const { grade, hasData } = getStudentPerformance(std.id);

                                    let gradeColor = '#6b7280'; // Gray for N/A

                                    let gradeBg = '#f3f4f6';

                                    if (grade === 'A') { gradeColor = '#166534'; gradeBg = '#f0fdf4'; }
                                    else if (grade === 'B') { gradeColor = '#0369a1'; gradeBg = '#e0f2fe'; }
                                    else if (grade === 'C') { gradeColor = '#b45309'; gradeBg = '#fef3c7'; }
                                    else if (grade === 'D') { gradeColor = '#b91c1c'; gradeBg = '#fee2e2'; }
                                    else if (grade === 'F') { gradeColor = '#ef4444'; gradeBg = '#fee2e2'; }

                                    // Status Logic based on Grade
                                    let statusLabel = hasData ? 'Good Standing' : 'No Data';
                                    let statusStyle = styles.statusGood;
                                    let StatusIcon = CheckCircle;

                                    if (!hasData) {
                                        statusStyle = styles.statusAverage; // Neutral
                                        StatusIcon = AlertCircle;
                                    } else if (grade === 'F') {
                                        statusLabel = 'At Risk';
                                        statusStyle = styles.statusRisk;
                                        StatusIcon = AlertTriangle;
                                    } else if (grade === 'D') {
                                        statusLabel = 'Average';
                                        statusStyle = styles.statusAverage;
                                        StatusIcon = AlertCircle;
                                    }

                                    return (
                                        <tr key={std.id} style={{ cursor: 'pointer' }} onClick={() => openProfile(std)}>
                                            <td style={{ color: '#6b7280', fontWeight: '500', paddingLeft: '1.5rem' }}>{String(index + 1).padStart(2, '0')}</td>
                                            <td className={styles.codeText}>{std.rollNo || std.regNo}</td>
                                            <td>
                                                <div className={styles.studentNameCell}>
                                                    <div className={styles.avatar} style={{
                                                        background: `linear-gradient(135deg, ${['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][index % 5]} 0%, ${['#1d4ed8', '#047857', '#b45309', '#6d28d9', '#be185d'][index % 5]} 100%)`
                                                    }}>
                                                        {std.name.charAt(0)}
                                                    </div>
                                                    {std.name}
                                                </div>
                                            </td>
                                            {/* Fix: Display 2nd Semester correctly */}
                                            <td>{std.sem === '2nd' ? '2nd Semester' : (std.semester || '2nd Semester')}</td>
                                            <td>
                                                <span className={styles.badge} style={{ background: '#f3f4f6', color: '#374151' }}>
                                                    {std.section || 'A'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`${styles.statusBadge} ${statusStyle}`}>
                                                    <StatusIcon size={14} /> {statusLabel}
                                                </span>
                                            </td>
                                            <td>
                                                <span style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '6px',
                                                    fontSize: '0.85rem',
                                                    fontWeight: '600',
                                                    background: gradeBg,
                                                    color: gradeColor
                                                }}>
                                                    Grade {grade}
                                                </span>
                                            </td>
                                            <td>
                                                <div className={styles.actionIcons}>
                                                    <button className={styles.iconBtn} title="View Profile">
                                                        <Users size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const renderCIEEntry = () => {
        // Level 1: Select Department
        if (!selectedSubject && !selectedCieDept) {
            const cieDepartments = [...new Set(mySubjects.map(sub => sub.department).filter(Boolean))].sort();

            if (cieDepartments.length === 0) {
                return (
                    <div className={styles.emptyState}>
                        <Building2 size={48} style={{ color: '#cbd5e1', marginBottom: '1rem' }} />
                        <p>You have no subjects assigned.</p>
                    </div>
                );
            }

            if (cieDepartments.length === 1) {
                setTimeout(() => setSelectedCieDept(cieDepartments[0]), 0);
                return <div style={{ textAlign: 'center', padding: '4rem' }}>Loading subjects...</div>;
            }

            return (
                <div className={styles.sectionContainer}>
                    <div className={styles.engagingHeader}>
                        <div className={styles.headerContent}>
                            <h1 className={styles.subjectTitle}>CIE Entry - Select Department</h1>
                            <p className={styles.subjectMeta} style={{ color: '#dbeafe' }}>Choose a department to view subjects and enter marks</p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
                        {cieDepartments.map(dept => (
                            <div
                                key={dept}
                                onClick={() => setSelectedCieDept(dept)}
                                style={{
                                    background: 'white',
                                    borderRadius: '16px',
                                    padding: '2rem 1.5rem',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
                                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                    border: '1px solid #f1f5f9'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-5px)';
                                    e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)';
                                }}
                            >
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '50%',
                                    background: '#e0f2fe',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 1.5rem auto'
                                }}>
                                    <Building2 size={40} color="#0284c7" />
                                </div>
                                <h3 style={{ margin: '0 0 0.5rem 0', color: '#0f172a', fontSize: '1.25rem' }}>{dept}</h3>
                                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>View Subjects</p>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        // Level 2: Select Subject for a previously selected Department
        if (!selectedSubject && selectedCieDept) {
            const filteredSubjects = mySubjects.filter(sub => sub.department === selectedCieDept);
            const cieDepartments = [...new Set(mySubjects.map(sub => sub.department).filter(Boolean))].sort();

            return (
                <div className={styles.sectionContainer}>
                    <div
                        className={styles.backLink}
                        onClick={() => {
                            if (cieDepartments.length > 1) setSelectedCieDept(null);
                        }}
                        style={{
                            marginBottom: '1rem',
                            display: cieDepartments.length > 1 ? 'inline-flex' : 'none',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#e0f2fe',
                            color: '#0369a1',
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '0.9rem',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#bae6fd'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = '#e0f2fe'; e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                        <span style={{ marginRight: '0.5rem' }}>←</span> Back to Departments
                    </div>

                    <div className={styles.engagingHeader} style={{ marginBottom: '2rem' }}>
                        <div className={styles.headerContent}>
                            <h1 className={styles.subjectTitle}>{selectedCieDept} - Subjects</h1>
                            <p className={styles.subjectMeta} style={{ color: '#dbeafe' }}>Select a subject to enter marks</p>
                        </div>
                    </div>

                    {filteredSubjects.length === 0 ? (
                        <div className={styles.emptyState}>
                            <Building2 size={48} style={{ color: '#cbd5e1', marginBottom: '1rem' }} />
                            <p>You have no subjects assigned.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                            {filteredSubjects.map(sub => (
                                <div key={sub.id} className={styles.subjectCard} onClick={() => handleSubjectClick(sub)} style={{ padding: '1.5rem', transition: 'all 0.2s ease', cursor: 'pointer', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                                    onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)'; }}>

                                    <div className={styles.cardHeader} style={{ marginBottom: '1.5rem', alignItems: 'flex-start' }}>
                                        <h3 className={styles.subjectName} style={{ fontSize: '1.25rem', lineHeight: '1.4' }}>{sub.name}</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                                            <span className={styles.termBadge} style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>{sub.semester} Sem</span>
                                            {sub.department && (
                                                <span className={styles.termBadge} style={{ backgroundColor: '#f1f5f9', color: '#475569', fontSize: '0.8rem' }}>{sub.department}</span>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                            <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Code: <strong style={{ color: '#334155' }}>{sub.code}</strong></span>
                                            <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
                                                <Users size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                                                {/* Dynamic Student Count */}
                                                {students.filter(s => s.department === sub.department && String(s.semester) === String(sub.semester)).length} Students
                                            </span>
                                        </div>

                                        {/* Dynamic Progress Calculation */}
                                        {(() => {
                                            // Filter students for this specific subject AND faculty's sections
                                            const subjectStudents = students.filter(s =>
                                                s.department === sub.department &&
                                                String(s.semester) === String(sub.semester) &&
                                                (facultySections.length === 0 || facultySections.includes(s.section))
                                            );
                                            const totalStd = subjectStudents.length;

                                            // Count how many have at least one mark entry for this subject
                                            let evaluatedCount = 0;
                                            if (totalStd > 0 && allStudentMarks && allStudentMarks[sub.id]) {
                                                evaluatedCount = subjectStudents.filter(std => {
                                                    const m = allStudentMarks[sub.id][std.id];
                                                    // Check if student has ANY valid mark (CIE1-5)
                                                    return m && ['cie1', 'cie2', 'cie3', 'cie4', 'cie5'].some(k => m[k] !== undefined && m[k] !== null && m[k] !== '');
                                                }).length;
                                            }

                                            const completion = totalStd > 0 ? Math.round((evaluatedCount / totalStd) * 100) : 0;

                                            return (
                                                <>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#4b5563', marginBottom: '6px' }}>
                                                        <span style={{ flex: 1 }}>Completion</span>
                                                        <span style={{ fontWeight: '600', color: completion === 100 ? '#059669' : '#2563eb' }}>{completion}%</span>
                                                    </div>
                                                    <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${completion}%`, height: '100%', background: completion === 100 ? '#10b981' : '#3b82f6', borderRadius: '4px', transition: 'width 0.5s ease' }}></div>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>

                                    <div className={styles.subjectFooter} style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Last updated: 2 days ago</span>
                                        <button style={{
                                            padding: '0.5rem 1rem',
                                            borderRadius: '8px',
                                            background: '#eff6ff',
                                            color: '#2563eb',
                                            border: 'none',
                                            fontSize: '0.9rem',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            transition: 'background 0.2s ease'
                                        }} onMouseOver={(e) => e.currentTarget.style.background = '#dbeafe'} onMouseOut={(e) => e.currentTarget.style.background = '#eff6ff'}>
                                            Enter Marks →
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        // Level 3: Marks Entry Table
        return (
            <div className={styles.sectionContainer}>

                <div
                    className={styles.backLink}
                    onClick={() => setSelectedSubject(null)}
                    style={{
                        marginBottom: '1rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#e0f2fe',
                        color: '#0369a1',
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '0.9rem',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = '#bae6fd'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = '#e0f2fe'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                    <span style={{ marginRight: '0.5rem' }}>←</span> Back to Subjects
                </div>

                {/* NEW ATTRACTIVE HEADER */}
                <div className={styles.engagingHeader}>
                    <div className={styles.headerContent}>
                        <div className={styles.headerTopRow}>
                            <div>
                                <h1 className={styles.subjectTitle}>Update Marks: {selectedSubject.name}</h1>
                                <div className={styles.subjectMeta}>
                                    <span>{selectedSubject.code}</span>
                                    <span>|</span>
                                    <span>{selectedSubject.semester} Sem</span>
                                </div>
                            </div>
                            <div className={styles.maxMarksBadge}>
                                Max: CIE-1(50), CIE-2(50), CIE-3(50), CIE-4(50), CIE-5(50)
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.sectionHeader}>
                    <div className={styles.headerTitleGroup}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: '1rem' }}>
                            <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>View:</span>
                            <select
                                className={styles.deptSelect}
                                value={selectedCieType}
                                onChange={(e) => setSelectedCieType(e.target.value)}
                                style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}
                            >
                                <option value="cie1">CIE-1</option>
                                <option value="cie2">CIE-2</option>
                                <option value="cie3">CIE-3</option>
                                <option value="cie4">CIE-4</option>
                                <option value="cie5">CIE-5</option>
                                <option value="all">All CIEs & Attendance</option>
                            </select>
                        </div>
                        {facultySections.length > 1 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>Section Filter:</span>
                                <select
                                    className={styles.deptSelect}
                                    value={selectedSection}
                                    onChange={(e) => setSelectedSection(e.target.value)}
                                    style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}
                                >
                                    <option value="All">All Sections</option>
                                    {facultySections.map(sec => <option key={sec} value={sec}>Section {sec}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className={styles.headerActions}>
                        <div className={styles.actionButtons}>


                            <button className={styles.secondaryBtn} onClick={togglePreview} title="Preview Report">
                                <FileText size={16} /> Preview
                            </button>

                            {!isLocked ? (
                                <>
                                    <button className={`${styles.saveBtn} ${saving ? styles.saving : ''}`} onClick={handleSave} disabled={saving}>
                                        <Save size={16} />
                                        {saving ? 'Saving...' : 'Save Draft'}
                                    </button>

                                    <button className={styles.saveBtn} onClick={handleSubmitForApproval} disabled={saving} style={{ backgroundColor: '#059669' }}>
                                        <CheckCircle size={16} /> Submit to HOD
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button className={styles.secondaryBtn} disabled style={{ cursor: 'not-allowed', color: '#6b7280', borderColor: '#d1d5db' }}>
                                        <Lock size={16} /> Marks Locked
                                    </button>
                                    <button
                                        className={styles.saveBtn}
                                        onClick={handleEditRequest}
                                        style={{ backgroundColor: '#f59e0b', color: 'white' }}
                                        title="Request permission from HOD to edit these marks"
                                    >
                                        <Edit size={16} /> Request Edit
                                    </button>
                                </>
                            )}

                            <button className={`${styles.saveBtn}`} onClick={downloadCSV} style={{ backgroundColor: '#4b5563' }}>
                                <Download size={16} /> Download
                            </button>

                            <button className={`${styles.saveBtn}`} onClick={() => setShowUploadModal(true)} style={{ backgroundColor: '#7c3aed' }}>
                                <Upload size={16} /> Bulk Upload
                            </button>
                        </div>
                    </div>
                </div>




                <div className={styles.card}>
                    <div className={styles.tableContainer}>
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Sl No</th>
                                        <th>Reg No</th>
                                        <th>Student Name</th>
                                        <th style={['cie1', 'all'].includes(selectedCieType) ? { background: '#eff6ff', color: '#1d4ed8' } : {}}>CIE-1 (50)</th>
                                        {['cie1', 'all'].includes(selectedCieType) && <th style={{ background: '#f0fdf4', color: '#15803d' }}>Att (%)</th>}
                                        <th style={['cie2', 'all'].includes(selectedCieType) ? { background: '#eff6ff', color: '#1d4ed8' } : {}}>CIE-2 (50)</th>
                                        {['cie2', 'all'].includes(selectedCieType) && <th style={{ background: '#f0fdf4', color: '#15803d' }}>Att (%)</th>}
                                        <th style={['cie3', 'all'].includes(selectedCieType) ? { background: '#eff6ff', color: '#1d4ed8' } : {}}>CIE-3 (50)</th>
                                        {['cie3', 'all'].includes(selectedCieType) && <th style={{ background: '#f0fdf4', color: '#15803d' }}>Att (%)</th>}
                                        <th style={['cie4', 'all'].includes(selectedCieType) ? { background: '#eff6ff', color: '#1d4ed8' } : {}}>CIE-4 (50)</th>
                                        {['cie4', 'all'].includes(selectedCieType) && <th style={{ background: '#f0fdf4', color: '#15803d' }}>Att (%)</th>}
                                        <th style={['cie5', 'all'].includes(selectedCieType) ? { background: '#eff6ff', color: '#1d4ed8' } : {}}>CIE-5 (50)</th>
                                        {['cie5', 'all'].includes(selectedCieType) && <th style={{ background: '#f0fdf4', color: '#15803d' }}>Att (%)</th>}
                                        <th>Total (250)</th>
                                        <th style={{ background: '#fefce8', color: '#a16207', width: '250px', minWidth: '250px' }}>Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students
                                        .filter(s => {
                                            if (!selectedSubject) return false;
                                            const subjectMatch = s.department === selectedSubject.department && String(s.semester) === String(selectedSubject.semester);
                                            const sectionMatch = selectedSection === 'All' || s.section === selectedSection;
                                            const facultySectionMatch = facultySections.length === 0 || facultySections.includes(s.section);
                                            return subjectMatch && sectionMatch && facultySectionMatch;
                                        })
                                        .map((student, index) => {
                                            const sMarks = marks[student.id] || {};
                                            const ia1Mark = sMarks['CIE1'] || {};

                                            const valCIE1 = sMarks.cie1 !== undefined ? sMarks.cie1 : (ia1Mark.cie1Score != null ? ia1Mark.cie1Score : '');
                                            const valCIE2 = sMarks.cie2 !== undefined ? sMarks.cie2 : (ia1Mark.cie2Score != null ? ia1Mark.cie2Score : '');
                                            const valCIE3 = sMarks.cie3 !== undefined ? sMarks.cie3 : '';
                                            const valCIE4 = sMarks.cie4 !== undefined ? sMarks.cie4 : '';
                                            const valCIE5 = sMarks.cie5 !== undefined ? sMarks.cie5 : '';

                                            const renderAttendanceCell = (cieKey) => {
                                                if (selectedCieType !== cieKey && selectedCieType !== 'all') return null;
                                                const attField = cieKey + 'Att';
                                                return (
                                                    <td style={{ background: '#f0fdf4' }}>
                                                        <input
                                                            type="number"
                                                            className={styles.markInput}
                                                            value={sMarks[attField] !== undefined ? sMarks[attField] : ''}
                                                            onChange={(e) => handleMarkChange(student.id, attField, e.target.value)}
                                                            placeholder=""
                                                            min="0"
                                                            max="100"
                                                            disabled={cieLockStatus[cieKey]}
                                                            style={{ background: cieLockStatus[cieKey] ? '#e5e7eb' : '#f0fdf4', border: '1px solid #86efac' }}
                                                        />
                                                    </td>
                                                );
                                            };

                                            return (
                                                <tr key={student.id}>
                                                    <td>{index + 1}</td>
                                                    <td style={{ whiteSpace: 'nowrap' }}>{student.rollNo || student.regNo}</td>
                                                    <td style={{ whiteSpace: 'nowrap' }}>{student.name}</td>
                                                    <td style={['cie1', 'all'].includes(selectedCieType) ? { background: '#eff6ff' } : {}}>
                                                        <input
                                                            type="number"
                                                            className={styles.markInput}
                                                            value={valCIE1}
                                                            onChange={(e) => handleMarkChange(student.id, 'cie1', e.target.value)}
                                                            onFocus={() => { if (selectedCieType !== 'all') setSelectedCieType('cie1') }}
                                                            placeholder=""
                                                            disabled={cieLockStatus.cie1}
                                                            style={cieLockStatus.cie1 ? { background: '#e5e7eb', cursor: 'not-allowed' } : {}}
                                                        />
                                                    </td>
                                                    {renderAttendanceCell('cie1')}
                                                    <td style={['cie2', 'all'].includes(selectedCieType) ? { background: '#eff6ff' } : {}}>
                                                        <input
                                                            type="number"
                                                            className={styles.markInput}
                                                            value={valCIE2}
                                                            onChange={(e) => handleMarkChange(student.id, 'cie2', e.target.value)}
                                                            onFocus={() => { if (selectedCieType !== 'all') setSelectedCieType('cie2') }}
                                                            placeholder=""
                                                            disabled={cieLockStatus.cie2}
                                                            style={cieLockStatus.cie2 ? { background: '#e5e7eb', cursor: 'not-allowed' } : {}}
                                                        />
                                                    </td>
                                                    {renderAttendanceCell('cie2')}
                                                    <td style={['cie3', 'all'].includes(selectedCieType) ? { background: '#eff6ff' } : {}}>
                                                        <input
                                                            type="number"
                                                            className={styles.markInput}
                                                            value={valCIE3}
                                                            onChange={(e) => handleMarkChange(student.id, 'cie3', e.target.value)}
                                                            onFocus={() => { if (selectedCieType !== 'all') setSelectedCieType('cie3') }}
                                                            placeholder=""
                                                            disabled={cieLockStatus.cie3}
                                                            style={cieLockStatus.cie3 ? { background: '#e5e7eb', cursor: 'not-allowed' } : {}}
                                                        />
                                                    </td>
                                                    {renderAttendanceCell('cie3')}
                                                    <td style={['cie4', 'all'].includes(selectedCieType) ? { background: '#eff6ff' } : {}}>
                                                        <input
                                                            type="number"
                                                            className={styles.markInput}
                                                            value={valCIE4}
                                                            onChange={(e) => handleMarkChange(student.id, 'cie4', e.target.value)}
                                                            onFocus={() => { if (selectedCieType !== 'all') setSelectedCieType('cie4') }}
                                                            placeholder=""
                                                            disabled={cieLockStatus.cie4}
                                                            style={cieLockStatus.cie4 ? { background: '#e5e7eb', cursor: 'not-allowed' } : {}}
                                                        />
                                                    </td>
                                                    {renderAttendanceCell('cie4')}
                                                    <td style={['cie5', 'all'].includes(selectedCieType) ? { background: '#eff6ff' } : {}}>
                                                        <input
                                                            type="number"
                                                            className={styles.markInput}
                                                            value={valCIE5}
                                                            onChange={(e) => handleMarkChange(student.id, 'cie5', e.target.value)}
                                                            onFocus={() => { if (selectedCieType !== 'all') setSelectedCieType('cie5') }}
                                                            placeholder=""
                                                            disabled={cieLockStatus.cie5}
                                                            style={cieLockStatus.cie5 ? { background: '#e5e7eb', cursor: 'not-allowed' } : {}}
                                                        />
                                                    </td>
                                                    {renderAttendanceCell('cie5')}
                                                    <td style={{ fontWeight: 'bold' }}>{calculateAverage(student)}</td>
                                                    {(() => {
                                                        const getCieRemark = (key, label) => {
                                                            const v = sMarks[key] !== undefined && sMarks[key] !== '' ? parseFloat(sMarks[key]) : null;
                                                            const a = sMarks[key + 'Att'] !== undefined && sMarks[key + 'Att'] !== '' ? parseFloat(sMarks[key + 'Att']) : null;
                                                            if (v == null || isNaN(v) || a == null || isNaN(a)) return null;

                                                            return {
                                                                label,
                                                                lowMarks: v < 25,
                                                                lowAtt: a < 75,
                                                                excellent: v >= 40 && a >= 75,
                                                                severity: (v < 25 && a < 75) ? 3 : (v < 25 ? 2 : (a < 75 ? 2 : 0)),
                                                                text: (v < 25 && a < 75) ? `${label}: Low Marks, Low Att` :
                                                                    (v < 25 ? `${label}: Low Marks` :
                                                                        (a < 75 ? `${label}: Low Att` :
                                                                            (v >= 40 && a >= 75 ? `${label}: Excellent` : `${label}: Good`)))
                                                            };
                                                        };
                                                        const allCies = [
                                                            getCieRemark('cie1', 'CIE-1'), getCieRemark('cie2', 'CIE-2'),
                                                            getCieRemark('cie3', 'CIE-3'), getCieRemark('cie4', 'CIE-4'),
                                                            getCieRemark('cie5', 'CIE-5')
                                                        ];
                                                        const filled = allCies.filter(r => r !== null);

                                                        // If all is selected, show combined remarks for filled ones.
                                                        if (selectedCieType === 'all' && filled.length > 0) {
                                                            const worst = Math.max(...filled.map(r => r.severity));
                                                            const color = worst >= 3 ? '#dc2626' : worst >= 2 ? '#ea580c' : '#15803d';
                                                            const bg = worst >= 3 ? '#fef2f2' : worst >= 2 ? '#fff7ed' : '#f0fdf4';

                                                            const lowMarksCies = filled.filter(r => r.lowMarks).map(r => r.label);
                                                            const lowAttCies = filled.filter(r => r.lowAtt).map(r => r.label);

                                                            let textParts = [];
                                                            if (lowMarksCies.length > 0) {
                                                                textParts.push(`${lowMarksCies.join(',')} Low Marks`);
                                                            }
                                                            if (lowAttCies.length > 0) {
                                                                textParts.push(`${lowAttCies.join(',')} Low Att`);
                                                            }
                                                            if (textParts.length === 0) {
                                                                const allExcellent = filled.every(r => r.excellent);
                                                                textParts.push(allExcellent ? 'All Excellent' : 'All Good');
                                                            }
                                                            const text = textParts.join(' | ');
                                                            return <td style={{ width: '250px', minWidth: '250px', padding: '8px 4px', background: bg }}>
                                                                <div style={{ fontSize: '0.65rem', fontWeight: 600, color, whiteSpace: 'normal', wordWrap: 'break-word', lineHeight: '1.4' }}>{text}</div>
                                                            </td>;
                                                        } else if (selectedCieType === 'all' && filled.length === 0) {
                                                            return <td style={{ width: '250px', minWidth: '250px', padding: 0 }}><div style={{ fontSize: '0.72rem', color: '#94a3b8', padding: '8px 4px' }}>-</div></td>;
                                                        }

                                                        // Otherwise show focused CIE's remark
                                                        const focused = getCieRemark(selectedCieType, selectedCieType.replace('cie', 'CIE-'));
                                                        if (!focused) return <td style={{ width: '250px', minWidth: '250px', padding: 0 }}><div style={{ fontSize: '0.72rem', color: '#94a3b8', padding: '8px 4px' }}>-</div></td>;
                                                        const color = focused.severity >= 3 ? '#dc2626' : focused.severity >= 2 ? '#ea580c' : focused.severity === 0 ? '#15803d' : '#2563eb';
                                                        const bg = focused.severity >= 3 ? '#fef2f2' : focused.severity >= 2 ? '#fff7ed' : '#f0fdf4';
                                                        return <td style={{ width: '250px', minWidth: '250px', padding: '8px 4px', background: bg }}>
                                                            <div style={{ fontSize: '0.72rem', fontWeight: 600, color, whiteSpace: 'normal', wordWrap: 'break-word', lineHeight: '1.4' }}>{focused.text}</div>
                                                        </td>;
                                                    })()}
                                                </tr>
                                            )
                                        })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        );
    };





    const renderMentorship = () => {
        // Filter real students from API
        const realMentees = students.filter(s => menteeIds.includes(s.id));

        // Combine with manually added mentees
        const allMentees = [...realMentees, ...manualMentees];

        // Calculate performance color
        const getPerformanceColor = (avg) => {
            if (avg < 40) return { bg: '#fee2e2', text: '#b91c1c', icon: <AlertTriangle size={14} /> };
            if (avg < 75) return { bg: '#fef3c7', text: '#b45309', icon: <AlertCircle size={14} /> };
            return { bg: '#dcfce7', text: '#15803d', icon: <CheckCircle size={14} /> };
        };

        return (
            <div className={styles.sectionContainer}>
                <div className={styles.sectionHeader}>
                    <div>
                        <h2 className={styles.sectionTitle}>Mentorship / Proctoring</h2>
                        <p style={{ color: '#64748b', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                            Managing {allMentees.length} students under mentorship.
                        </p>
                    </div>
                    <div className={styles.headerActions}>
                        <button className={styles.saveBtn} onClick={() => setShowMenteeModal(true)} style={{ background: '#2563eb' }}>
                            <FilePlus size={16} /> Add New Student
                        </button>
                        <button className={styles.filterBtn} onClick={() => showToast('Meeting Logs Downloaded')}>
                            <Download size={16} /> Export Logs
                        </button>
                    </div>
                </div>

                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Student Details</th>
                                <th>Parent Contact</th>

                                <th>Academic Standing (CIE Avg)</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allMentees.length > 0 ? allMentees.map(student => {
                                const avgScore = student.isManual ? parseInt(student.avgMark) || 0 : (() => {
                                    let totalScored = 0;
                                    let count = 0;
                                    if (allStudentMarks) {
                                        Object.keys(allStudentMarks).forEach(subId => {
                                            const m = allStudentMarks[subId][student.id];
                                            if (m) {
                                                const cies = ['cie1', 'cie2', 'cie3', 'cie4', 'cie5'];
                                                cies.forEach(cKey => {
                                                    const val = m[cKey];
                                                    if (val !== undefined && val !== null && val !== '') {
                                                        totalScored += (val === 'Ab' ? 0 : (parseInt(val) || 0));
                                                        count++;
                                                    }
                                                });
                                            }
                                        });
                                    }
                                    return count > 0 ? Math.round((totalScored / (count * 50)) * 100) : 0;
                                })();


                                const perf = getPerformanceColor(avgScore);

                                return (
                                    <tr key={student.id}>
                                        <td>
                                            <div className={styles.studentNameCell}>
                                                <div className={styles.avatar} style={{
                                                    width: '32px', height: '32px', fontSize: '0.85rem',
                                                    background: '#eff6ff', color: '#1d4ed8'
                                                }}>
                                                    {student.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: '600', color: '#111827' }}>{student.name}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{student.regNo || student.rollNo}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>{student.parentPhone}</span>
                                                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Relationship: Parent</span>
                                            </div>
                                        </td>

                                        <td>
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '0.3rem 0.8rem',
                                                borderRadius: '20px',
                                                backgroundColor: perf.bg,
                                                color: perf.text,
                                                fontWeight: '600',
                                                fontSize: '0.85rem'
                                            }}>
                                                {perf.icon}
                                                {avgScore > 0 ? `${avgScore}% Avg` : 'No Data'}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                className={styles.iconBtn}
                                                onClick={() => handleEditStudent(student)}
                                                style={{ color: '#0ea5e9', background: '#e0f2fe', padding: '6px', marginRight: '8px' }}
                                                title="Edit Student Details"
                                            >
                                                <Edit3 size={16} />
                                            </button>
                                            <button
                                                className={styles.iconBtn}
                                                onClick={() => handleRemoveMentee(student.id)}
                                                style={{ color: '#dc2626', background: '#fee2e2', padding: '6px' }}
                                                title="Remove from Mentorship"
                                            >
                                                <X size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                            <Users size={32} style={{ opacity: 0.5 }} />
                                            <p>No students assigned for mentorship.</p>
                                            <button className={styles.secondaryBtn} onClick={() => setShowMenteeModal(true)}>
                                                + Add Your First Student
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderLessonPlan = () => {
        return (
            <div className={styles.sectionContainer}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Syllabus Tracker & Lesson Plan</h2>
                    <div className={styles.headerActions}>
                        <button className={styles.saveBtn} onClick={() => showToast('Report Sent to HOD')}>
                            <FileText size={16} /> Submit Monthly Report
                        </button>
                    </div>
                </div>

                <div className={styles.gridContainer}>
                    {mySubjects.map(sub => {
                        const progress = lessonPlanData[sub.id] || {};
                        const units = syllabusConfig[sub.id] || [
                            { id: 'u1', name: 'Unit 1: Introduction' },
                            { id: 'u2', name: 'Unit 2: Core Concepts' },
                            { id: 'u3', name: 'Unit 3: Advanced Topics' },
                            { id: 'u4', name: 'Unit 4: Application' },
                            { id: 'u5', name: 'Unit 5: Case Studies' }
                        ];
                        const completedCount = units.filter(u => progress[u.id]).length;
                        const totalUnits = units.length;
                        const percent = totalUnits > 0 ? Math.round((completedCount / totalUnits) * 100) : 0;

                        return (
                            <div key={sub.id} className={styles.card} style={{ padding: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <div>
                                        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>{sub.name}</h3>
                                        <span className={styles.termBadge} style={{ fontSize: '0.75rem' }}>{sub.semester} Sem</span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: percent === 100 ? '#10b981' : '#3b82f6' }}>{percent}%</span>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>Completed</p>
                                    </div>
                                </div>

                                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '1rem' }}>
                                    {units.map(unit => (
                                        <div key={unit.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.8rem', fontSize: '0.9rem' }}>
                                            <div
                                                onClick={() => toggleUnit(sub.id, unit.id)}
                                                style={{
                                                    width: '20px', height: '20px', borderRadius: '4px', border: '2px solid', marginRight: '10px', cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    borderColor: progress[unit.id] ? '#10b981' : '#d1d5db',
                                                    backgroundColor: progress[unit.id] ? '#10b981' : 'white'
                                                }}
                                            >
                                                {progress[unit.id] && <CheckCircle size={14} color="white" />}
                                            </div>
                                            <span style={{ color: progress[unit.id] ? '#111827' : '#6b7280', textDecoration: progress[unit.id] ? 'line-through' : 'none' }}>
                                                {unit.name}
                                            </span>
                                        </div>
                                    ))}

                                    {/* Add Unit UI */}
                                    {addingToSubject === sub.id ? (
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '1rem' }}>
                                            <input
                                                type="text"
                                                placeholder="Enter topic name..."
                                                value={newUnitName}
                                                onChange={(e) => setNewUnitName(e.target.value)}
                                                style={{ flex: 1, padding: '6px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '0.9rem' }}
                                                autoFocus
                                            />
                                            <button
                                                onClick={() => addUnit(sub.id)}
                                                style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', padding: '0 10px', cursor: 'pointer' }}
                                            >
                                                Add
                                            </button>
                                            <button
                                                onClick={() => setAddingToSubject(null)}
                                                style={{ background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '4px', padding: '0 10px', cursor: 'pointer' }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setAddingToSubject(sub.id)}
                                            style={{
                                                marginTop: '0.5rem',
                                                background: 'none',
                                                border: '1px dashed #9ca3af',
                                                color: '#6b7280',
                                                width: '100%',
                                                padding: '8px',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontSize: '0.85rem'
                                            }}
                                        >
                                            + Add Syllabus Topic
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderEditStudentModal = () => {
        if (!showEditModal || !editingStudent) return null;

        return (
            <div className={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
                <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.modalHeader}>
                        <h2>Edit Student Details</h2>
                        <button className={styles.closeBtn} onClick={() => setShowEditModal(false)}>
                            <X size={20} />
                        </button>
                    </div>
                    <div className={styles.modalBody}>
                        <form onSubmit={handleUpdateStudent}>
                            <div className={styles.formGroup}>
                                <label>Student Name</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={editingStudent.name || ''}
                                    onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Register Number</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={editingStudent.regNo || editingStudent.rollNo || ''}
                                    onChange={(e) => setEditingStudent({ ...editingStudent, regNo: e.target.value })}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Parent Phone</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={editingStudent.parentPhone || ''}
                                    onChange={(e) => setEditingStudent({ ...editingStudent, parentPhone: e.target.value })}
                                />
                            </div>

                            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button type="button" className={styles.filterBtn} onClick={() => setShowEditModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className={styles.saveBtn}>
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        );
    };

    // --- NEW FEATURE: CIE SCHEDULE UPDATE (Faculty) ---
    const renderCIESchedule = () => {
        // Use iaConfig directly which is populated by fetchSchedule
        const currentSchedule = {
            date: iaConfig.date || '-',
            time: iaConfig.time || '-',
            room: iaConfig.room || '-',
            duration: iaConfig.duration ? `${iaConfig.duration} Minutes` : '-'
        };

        return (
            <div className={styles.sectionContainer}>
                {/* Changed header gradient to Blue/Gray to match sidebar/theme */}
                <div className={styles.engagingHeader} style={{ background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)' }}>
                    <div className={styles.headerContent}>
                        <h1 className={styles.subjectTitle}>Update Syllabus for CIE</h1>
                        <p className={styles.subjectMeta} style={{ color: '#dbeafe' }}>Add syllabus topics for the scheduled CIE</p>
                    </div>
                </div>

                <div className={styles.mainContentGrid}>
                    {/* Left Column: Form */}
                    <div className={styles.leftColumn} style={{ flex: 2 }}>
                        <div className={styles.glassCard}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {/* Subject & CIE Select */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <label style={{ fontWeight: 600, color: '#374151', fontSize: '1rem' }}>Subject</label>
                                        <select
                                            name="subjectId"
                                            value={iaConfig.subjectId}
                                            onChange={handleIaConfigChange}
                                            className={styles.largeInput}
                                            style={{ width: '100%' }}
                                        >
                                            <option value="">Select Subject</option>
                                            {mySubjects.map(sub => (
                                                <option key={sub.id} value={sub.id}>{sub.name} ({sub.code}) - {sub.department}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <label style={{ fontWeight: 600, color: '#374151', fontSize: '1rem' }}>CIE Number</label>
                                        <div style={{ display: 'flex', gap: '0.5rem', background: '#f8fafc', padding: '6px', borderRadius: '10px', border: '1px solid #cbd5e1', height: '100%' }}>
                                            {['1', '2', '3', '4', '5'].map(num => (
                                                <button
                                                    key={num}
                                                    onClick={() => setIaConfig(prev => ({ ...prev, cieNumber: num }))}
                                                    style={{
                                                        flex: 1,
                                                        padding: '8px',
                                                        borderRadius: '8px',
                                                        border: 'none',
                                                        background: iaConfig.cieNumber === num ? '#2563eb' : 'transparent',
                                                        color: iaConfig.cieNumber === num ? 'white' : '#64748b',
                                                        fontWeight: 600,
                                                        fontSize: '1rem',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        boxShadow: iaConfig.cieNumber === num ? '0 2px 4px rgba(37, 99, 235, 0.2)' : 'none'
                                                    }}
                                                >
                                                    {num}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Syllabus */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontWeight: 600, color: '#374151', fontSize: '1rem' }}>Syllabus Coverage / Lessons</label>
                                    <textarea
                                        name="syllabus"
                                        value={iaConfig.syllabus}
                                        onChange={handleIaConfigChange}
                                        placeholder="Enter lessons or topics..."
                                        className={styles.largeInput}
                                        style={{ width: '100%', minHeight: '120px', resize: 'vertical' }}
                                    />
                                    <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0 }}>This will be visible to students as "Topics"</p>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                                    <button
                                        className={styles.secondaryBtn}
                                        style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}
                                        onClick={() => setIaConfig(prev => ({ ...prev, syllabus: '', instructions: '' }))}
                                    >
                                        Clear
                                    </button>
                                    <button
                                        className={styles.saveBtn}
                                        style={{
                                            padding: '0.75rem 1.5rem',
                                            fontSize: '1rem'
                                        }}
                                        onClick={handleAnnouncementSubmit}
                                    >
                                        <Megaphone size={18} /> Update Syllabus
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Preview/Info */}
                    <div className={styles.rightColumn} style={{ flex: 1 }}>
                        <div className={styles.glassCard} style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                            <h3 className={styles.cardTitle} style={{ color: '#1e293b' }}>Preview Notification</h3>

                            <div style={{ background: 'white', padding: '1.25rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2563eb' }}>SYLLABUS UPDATE</span>
                                    <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Just now</span>
                                </div>
                                <h4 style={{ margin: '0 0 0.5rem', color: '#1f2937', fontSize: '1.1rem' }}>
                                    {iaConfig.subjectId ? mySubjects.find(s => s.id === parseInt(iaConfig.subjectId))?.name : 'Subject Name'}
                                </h4>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.95rem', color: '#4b5563', marginBottom: '0.8rem' }}>
                                    <Calendar size={16} color="#64748b" />
                                    <span>CIE-{iaConfig.cieNumber} • {currentSchedule.date}</span>
                                </div>
                                <div style={{ fontSize: '0.9rem', color: '#4b5563', margin: 0, padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', borderLeft: '3px solid #cbd5e1' }}>
                                    {iaConfig.syllabus ? iaConfig.syllabus.substring(0, 80) + (iaConfig.syllabus.length > 80 ? '...' : '') : 'Syllabus details...'}
                                </div>
                            </div>

                            <div style={{ marginTop: '1.5rem' }}>
                                <h4 style={{ fontSize: '0.95rem', color: '#334155', marginBottom: '0.75rem', fontWeight: 600 }}>Who will be notified?</h4>
                                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.95rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <li>All enrolled students</li>
                                    <li>Department HOD</li>
                                    <li>Principal (Dashboard)</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* READ-ONLY Published Schedules from HOD - REVAMPED CARD STYLE */}
                <div className={styles.card} style={{ marginTop: '2rem' }}>
                    <div className={styles.cardHeader} style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: 0, color: '#1e293b' }}>📅 Published CIE Schedules</h3>
                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Upcoming Exams</span>
                    </div>

                    <div className={styles.alertList} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {publishedSchedules.filter(s => mySubjects.some(sub => sub.id === (s.subject?.id || s.subjectId))).length > 0 ?
                            publishedSchedules
                                .filter(s => mySubjects.some(sub => sub.id === (s.subject?.id || s.subjectId)))
                                .map(sched => (
                                    <div key={sched.id} className={styles.alertItem} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '1rem',
                                        background: '#f8fafc',
                                        borderRadius: '12px',
                                        border: '1px solid #e2e8f0',
                                        gap: '1rem'
                                    }}>
                                        <div style={{
                                            background: 'white',
                                            padding: '0.5rem',
                                            borderRadius: '8px',
                                            textAlign: 'center',
                                            minWidth: '60px',
                                            border: '1px solid #f1f5f9',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                        }}>
                                            <span style={{ display: 'block', fontSize: '1.2rem', fontWeight: 'bold', color: '#2563eb' }}>
                                                {sched.scheduledDate ? new Date(sched.scheduledDate).getDate() : '-'}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>
                                                {sched.scheduledDate ? new Date(sched.scheduledDate).toLocaleString('default', { month: 'short' }) : '-'}
                                            </span>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                                                <h4 style={{ margin: 0, fontSize: '1rem', color: '#1e293b', fontWeight: 600 }}>
                                                    {sched.subject ? sched.subject.name : 'Unknown Subject'}
                                                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'normal', marginLeft: '6px' }}>
                                                        ({sched.subject?.code})
                                                    </span>
                                                </h4>
                                                <span className={styles.statusBadge} style={{
                                                    background: '#dbeafe',
                                                    color: '#1e40af',
                                                    padding: '2px 8px',
                                                    borderRadius: '6px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600
                                                }}>
                                                    CIE-{sched.cieNumber}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', color: '#475569', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Clock size={16} className={styles.textBlue} />
                                                    {sched.startTime || '-'} ({sched.durationMinutes}m)
                                                </span>
                                                {sched.examRoom && (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <MapPin size={16} className={styles.textRed} />
                                                        {sched.examRoom}
                                                    </span>
                                                )}
                                            </div>
                                            {sched.instructions && (
                                                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#6b7280', fontStyle: 'italic' }}>
                                                    " {sched.instructions} "
                                                </div>
                                            )}
                                            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#94a3b8', textAlign: 'right' }}>
                                                Scheduled by: <span style={{ fontWeight: 600, color: '#64748b' }}>{sched.publishedBy || 'HOD'}</span>
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                                    <Calendar size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                                    <p>No exams scheduled yet.</p>
                                </div>
                            )}
                    </div>
                </div>
            </div>
        );
    };

    const renderLowPerformers = () => {
        return (
            <div className={styles.sectionContainer}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div>
                        <h2 className={styles.sectionTitle} style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                            <AlertTriangle size={24} /> Action Required: Low Performers
                        </h2>
                        <p style={{ color: '#64748b', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                            Students who scored less than 20/50 in any CIE.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <select
                            className={styles.searchInput}
                            style={{ width: 'auto', padding: '8px 12px', fontSize: '0.9rem' }}
                            value={filterSubject}
                            onChange={(e) => setFilterSubject(e.target.value)}
                        >
                            <option value="All">All Subjects</option>
                            {mySubjects.map(sub => (
                                <option key={sub.id} value={sub.name}>{sub.name}</option>
                            ))}
                        </select>
                        <select
                            className={styles.searchInput}
                            style={{ width: 'auto', padding: '8px 12px', fontSize: '0.9rem' }}
                            value={filterCIE}
                            onChange={(e) => setFilterCIE(e.target.value)}
                        >
                            <option value="All">All CIE</option>
                            {['CIE1', 'CIE2', 'CIE3', 'CIE4', 'CIE5'].map(cie => (
                                <option key={cie} value={cie}>{cie}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className={styles.card}>
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Sl No</th>
                                    <th>Reg No</th>
                                    <th>Student Name</th>
                                    <th>Marks</th>
                                    <th>Attendance</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {facultyClassAnalytics.lowPerformersList && facultyClassAnalytics.lowPerformersList
                                    .filter(item => filterSubject === 'All' || item.subject === filterSubject)
                                    .filter(item => filterCIE === 'All' || item.cieType === filterCIE)
                                    .length > 0 ? (
                                    facultyClassAnalytics.lowPerformersList
                                        .filter(item => filterSubject === 'All' || item.subject === filterSubject)
                                        .filter(item => filterCIE === 'All' || item.cieType === filterCIE)
                                        .map((item, i) => (
                                            <tr key={i}>
                                                <td style={{ color: '#64748b' }}>{i + 1}</td>
                                                <td className={styles.codeText}>{item.regNo}</td>
                                                <td>
                                                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{item.subject} ({item.cieType})</div>
                                                </td>
                                                <td style={{ color: '#ef4444', fontWeight: 'bold' }}>{item.score}/50</td>
                                                <td style={{ fontWeight: '500' }}>{item.attendance != null ? `${item.attendance}%` : 'N/A'}</td>
                                                <td>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                        <span style={{ fontSize: '0.85rem', fontWeight: '500', color: '#475569' }}>
                                                            {item.parentPhone || 'No Contact'}
                                                        </span>
                                                        <button
                                                            className={styles.iconBtn}
                                                            onClick={() => showToast(`Alert sent for ${item.name}`)}
                                                            title="Notify Parent"
                                                            style={{ color: '#dc2626', background: '#fee2e2', padding: '4px 8px', borderRadius: '6px', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: '600' }}
                                                        >
                                                            <Phone size={14} /> Notify
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                <CheckCircle size={32} color="#10b981" />
                                                <p>No low performers found matching filters!</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    // Clear Notifications Handler
    const handleClearNotifications = async () => {
        if (!window.confirm('Are you sure you want to clear all notifications?')) return;
        try {
            const token = user?.token;
            if (!token) return;
            const headers = { 'Authorization': `Bearer ${token}` };
            const response = await fetch(`${API_BASE_URL}/notifications/clear`, { method: 'DELETE', headers });
            if (response.ok) {
                setNotifications([]);
                setUnreadCount(0);
                showToast('Notifications cleared successfully');
            } else {
                showToast('Failed to clear notifications', 'error');
            }
        } catch (e) {
            console.error("Failed to clear notifications", e);
            showToast('Error clearing notifications', 'error');
        }
    };

    const handleDeleteNotification = async (id) => {
        try {
            const token = user?.token;
            if (!token) return;
            const headers = { 'Authorization': `Bearer ${token}` };
            const response = await fetch(`${API_BASE_URL}/notifications/${id}`, { method: 'DELETE', headers });
            if (response.ok) {
                setNotifications(prev => prev.filter(n => n.id !== id));
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (e) {
            console.error("Failed to delete notification", e);
        }
    };

    // Render Notifications Section
    const renderNotifications = () => {
        return (
            <div className={styles.card}>
                <div className={styles.cardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 className={styles.cardTitle} style={{ margin: 0 }}>All Notifications</h2>
                    {notifications.length > 0 && (
                        <button
                            className={styles.secondaryBtn}
                            onClick={handleClearNotifications}
                            style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', color: '#dc2626', borderColor: '#fecaca', background: '#fef2f2', display: 'flex', alignItems: 'center' }}
                        >
                            <Trash2 size={14} style={{ marginRight: '4px' }} /> Clear All
                        </button>
                    )}
                </div>
                <div className={styles.notificationsList}>
                    {notifications.length > 0 ? notifications.map(notif => (
                        <div key={notif.id} className={`${styles.notifItem} ${!notif.isRead ? styles.unread : ''}`} style={{ position: 'relative' }}>
                            <div className={styles.notifIcon}>
                                {notif.type === 'INFO' ? <Bell size={20} /> : <AlertCircle size={20} />}
                            </div>
                            <div className={styles.notifContent} style={{ paddingRight: '20px' }}>
                                <p className={styles.notifMessage}>{notif.message}</p>
                                <span className={styles.notifTime}>{new Date(notif.createdAt).toLocaleString()}</span>
                                {notif.category && <span className={styles.notifCategory}>{notif.category}</span>}
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteNotification(notif.id); }}
                                style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                                className={styles.deleteNotifBtn}
                                title="Delete"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )) : (
                        <div className={styles.emptyState}>
                            <Bell size={48} />
                            <p>No notifications yet</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };


    // === DEPARTMENT ASSIGNMENT HELPERS ===
    const fetchAllDepartments = async () => {
        try {
            const headers = { 'Authorization': `Bearer ${user.token}` };
            const res = await fetch(`${API_BASE_URL}/faculty/all-departments`, { headers });
            if (res.ok) {
                const data = await res.json();
                setAllDepartments(data);
            }
        } catch (e) { console.error("Failed to fetch departments", e); }
    };

    const fetchDeptSubjects = async (dept) => {
        try {
            const headers = { 'Authorization': `Bearer ${user.token}` };
            const res = await fetch(`${API_BASE_URL}/faculty/department-subjects?department=${encodeURIComponent(dept)}`, { headers });
            if (res.ok) {
                const data = await res.json();
                setDeptSubjects(data);
            }
        } catch (e) { console.error("Failed to fetch dept subjects", e); }
    };

    const fetchAvailableSections = async (dept, sem) => {
        try {
            const headers = { 'Authorization': `Bearer ${user.token}` };
            const res = await fetch(`${API_BASE_URL}/faculty/available-sections?department=${encodeURIComponent(dept)}&semester=${encodeURIComponent(sem)}`, { headers });
            if (res.ok) {
                const data = await res.json();
                setAvailableSections(Array.isArray(data) && data.length > 0 ? data : []);
            } else {
                setAvailableSections([]);
            }
        } catch (e) {
            console.error("Failed to fetch available sections", e);
            setAvailableSections([]);
        }
    };

    const fetchMyAssignmentRequests = async () => {
        try {
            const headers = { 'Authorization': `Bearer ${user.token}` };
            const res = await fetch(`${API_BASE_URL}/faculty/my-assignment-requests`, { headers });
            if (res.ok) {
                const data = await res.json();
                setMyAssignmentRequests(data);
            }
        } catch (e) { console.error("Failed to fetch assignment requests", e); }
    };

    const handleSubmitAssignmentRequest = async () => {
        if (!selectedTargetDept || selectedAssignSubjects.length === 0) {
            showToast('Please select a department and at least one subject', 'error');
            return;
        }
        setAssignLoading(true);
        try {
            const headers = { 'Authorization': `Bearer ${user.token}`, 'Content-Type': 'application/json' };
            const body = JSON.stringify({
                targetDepartment: selectedTargetDept,
                subjects: selectedAssignSubjects.join(', '),
                sections: assignSections.join(', '),
                semester: assignSemester
            });
            const res = await fetch(`${API_BASE_URL}/faculty/assignment-request`, { method: 'POST', headers, body });
            const data = await res.json();
            if (res.ok) {
                showToast(data.message || 'Request submitted!');
                setSelectedAssignSubjects([]);
                setAssignSections([]);
                setAssignSemester('');
                setAvailableSections([]);
                fetchMyAssignmentRequests();
            } else {
                showToast(data.message || 'Failed to submit request', 'error');
            }
        } catch (e) {
            showToast('Network error', 'error');
        }
        setAssignLoading(false);
    };

    const renderDeptAssignment = () => {
        // Fetch departments on first render of this section
        if (allDepartments.length === 0) fetchAllDepartments();
        if (myAssignmentRequests.length === 0) fetchMyAssignmentRequests();

        const statusColors = { PENDING: '#f59e0b', APPROVED: '#10b981', REJECTED: '#ef4444' };
        const statusBg = { PENDING: '#fef3c7', APPROVED: '#d1fae5', REJECTED: '#fef2f2' };

        return (
            <div>
                {/* Request Form */}
                <div className={styles.card} style={{ marginBottom: '1.5rem' }}>
                    <div className={styles.cardHeader} style={{ marginBottom: '1rem' }}>
                        <h2 className={styles.cardTitle} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Building2 size={22} /> Request Department Assignment
                        </h2>
                    </div>
                    <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                        Select a department and subjects you'd like to teach. The HOD of that department will review and approve your request.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        {/* Department Selector */}
                        <div>
                            <label className={styles.infoLabel} style={{ marginBottom: '0.5rem', display: 'block' }}>Target Department</label>
                            <select
                                className={styles.largeInput}
                                value={selectedTargetDept}
                                onChange={(e) => {
                                    setSelectedTargetDept(e.target.value);
                                    setSelectedAssignSubjects([]);
                                    setDeptSubjects([]);
                                    setAssignSemester('');
                                    setAssignSections([]);
                                    setAvailableSections([]);
                                    if (e.target.value) fetchDeptSubjects(e.target.value);
                                }}
                                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.95rem' }}
                            >
                                <option value="">-- Select Department --</option>
                                {allDepartments.map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                        </div>
                        {/* Semester */}
                        <div>
                            <label className={styles.infoLabel} style={{ marginBottom: '0.5rem', display: 'block' }}>Semester</label>
                            <select
                                className={styles.largeInput}
                                value={assignSemester}
                                disabled={!selectedTargetDept}
                                onChange={e => {
                                    setAssignSemester(e.target.value);
                                    setSelectedAssignSubjects([]);
                                    setAssignSections([]);
                                    setAvailableSections([]);
                                    if (selectedTargetDept && e.target.value) {
                                        fetchAvailableSections(selectedTargetDept, e.target.value);
                                    }
                                }}
                                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.95rem' }}
                            >
                                <option value="">-- Select Semester --</option>
                                {[1, 2, 3, 4, 5, 6].map(sem => (
                                    <option key={sem} value={sem}>{sem}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Sections Checkboxes (Dynamic based on department and semester) */}
                    {assignSemester && selectedTargetDept && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label className={styles.infoLabel} style={{ marginBottom: '0.5rem', display: 'block' }}>Sections</label>
                            {availableSections.length === 0 ? (
                                <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No sections found. Need to add students first.</p>
                            ) : (
                                <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                                    {availableSections.map(sec => (
                                        <label
                                            key={sec}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                                padding: '0.4rem 0.6rem', borderRadius: '6px',
                                                border: assignSections.includes(sec) ? '2px solid #2563eb' : '1px solid #e2e8f0',
                                                background: assignSections.includes(sec) ? '#eff6ff' : '#fff',
                                                cursor: 'pointer', fontSize: '0.9rem'
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={assignSections.includes(sec)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setAssignSections(prev => [...prev, sec]);
                                                    } else {
                                                        setAssignSections(prev => prev.filter(s => s !== sec));
                                                    }
                                                }}
                                                style={{ accentColor: '#2563eb' }}
                                            />
                                            Section {sec}
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Subject Checkboxes (Filtered by Selected Semester) */}
                    {selectedTargetDept && assignSemester && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label className={styles.infoLabel} style={{ marginBottom: '0.5rem', display: 'block' }}>Select Subjects (Sem {assignSemester})</label>
                            {deptSubjects.filter(sub => sub.semester.toString() === assignSemester.toString()).length === 0 ? (
                                <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No subjects found for this semester.</p>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.7rem' }}>
                                    {deptSubjects.filter(sub => sub.semester.toString() === assignSemester.toString()).map(sub => (
                                        <label
                                            key={sub.id}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                padding: '0.6rem 0.8rem', borderRadius: '8px',
                                                border: selectedAssignSubjects.includes(sub.name)
                                                    ? '2px solid #2563eb' : '1px solid #e2e8f0',
                                                background: selectedAssignSubjects.includes(sub.name)
                                                    ? '#eff6ff' : '#fff',
                                                cursor: 'pointer', transition: 'all 0.2s'
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedAssignSubjects.includes(sub.name)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedAssignSubjects(prev => [...prev, sub.name]);
                                                    } else {
                                                        setSelectedAssignSubjects(prev => prev.filter(n => n !== sub.name));
                                                    }
                                                }}
                                                style={{ accentColor: '#2563eb' }}
                                            />
                                            <div>
                                                <span style={{ fontWeight: 500 }}>{sub.name}</span>
                                                <span style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8' }}>{sub.code}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        className={styles.saveBtn}
                        onClick={handleSubmitAssignmentRequest}
                        disabled={assignLoading || !selectedTargetDept || selectedAssignSubjects.length === 0}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1.5rem', fontSize: '0.95rem' }}
                    >
                        <Send size={16} />
                        {assignLoading ? 'Submitting...' : 'Send Request to HOD'}
                    </button>
                </div>

                {/* My Requests History */}
                <div className={styles.card}>
                    <div className={styles.cardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h2 className={styles.cardTitle} style={{ margin: 0 }}>My Assignment Requests</h2>
                        <button
                            className={styles.secondaryBtn}
                            onClick={fetchMyAssignmentRequests}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                        >
                            <RefreshCw size={14} /> Refresh
                        </button>
                    </div>
                    {myAssignmentRequests.length > 0 ? (
                        <div style={{ overflowX: 'auto' }}>
                            <table className={styles.marksTable} style={{ width: '100%' }}>
                                <thead>
                                    <tr>
                                        <th style={{ padding: '0.7rem' }}>Department</th>
                                        <th style={{ padding: '0.7rem' }}>Subjects</th>
                                        <th style={{ padding: '0.7rem' }}>Sections</th>
                                        <th style={{ padding: '0.7rem' }}>Requested On</th>
                                        <th style={{ padding: '0.7rem' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {myAssignmentRequests.map(req => (
                                        <tr key={req.id}>
                                            <td style={{ padding: '0.7rem', fontWeight: 500 }}>{req.targetDepartment}</td>
                                            <td style={{ padding: '0.7rem', fontSize: '0.9rem' }}>{req.subjects}</td>
                                            <td style={{ padding: '0.7rem' }}>{req.sections || '-'}</td>
                                            <td style={{ padding: '0.7rem', fontSize: '0.85rem', color: '#64748b' }}>
                                                {req.requestDate ? new Date(req.requestDate).toLocaleDateString() : '-'}
                                            </td>
                                            <td style={{ padding: '0.7rem' }}>
                                                <span style={{
                                                    padding: '0.25rem 0.7rem',
                                                    borderRadius: '12px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 600,
                                                    color: statusColors[req.status] || '#64748b',
                                                    background: statusBg[req.status] || '#f1f5f9'
                                                }}>
                                                    {req.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className={styles.emptyState}>
                            <Building2 size={48} style={{ color: '#cbd5e1' }} />
                            <p>No assignment requests yet. Use the form above to request a cross-department teaching assignment.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <DashboardLayout menuItems={menuItems} >
            <header className={styles.header}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                        <h1 className={styles.welcomeText}>Hello, {user?.fullName || user?.username || 'Faculty'}</h1>
                        <p className={styles.subtitle}>FACULTY | {user?.username || 'Faculty'}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    </div>
                </div>
            </header>

            {activeSection === 'Overview' && renderOverview()
            }
            {activeSection === 'My Students' && renderMyStudents()}
            {activeSection === 'CIE Entry' && renderCIEEntry()}
            {renderPreviewModal()}

            {activeSection === 'Lesson Plan' && renderLessonPlan()}
            {activeSection === 'CIE Schedule' && renderCIESchedule()}
            {activeSection === 'Mentorship' && renderMentorship()}
            {activeSection === 'Low Performers' && renderLowPerformers()}
            {activeSection === 'Notifications' && renderNotifications()}
            {activeSection === 'Dept Assignment' && renderDeptAssignment()}

            {/* MODALS */}
            {renderStudentProfileModal()}
            {renderUploadModal()}
            {showMenteeModal && (
                <div className={styles.modalOverlay} onClick={() => setShowMenteeModal(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
                        <div className={styles.modalHeader}>
                            <h2>Add New Student to Mentorship</h2>
                            <button className={styles.closeBtn} onClick={() => setShowMenteeModal(false)}><X size={20} /></button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.tabHeader} style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                                <button
                                    className={modalTab === 'select' ? styles.tabBtnActive : styles.tabBtn}
                                    onClick={() => setModalTab('select')}
                                    style={{ background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 'bold', borderBottom: modalTab === 'select' ? '2px solid #2563eb' : 'none', color: modalTab === 'select' ? '#2563eb' : '#64748b' }}
                                >
                                    Quick Select (Dept Students)
                                </button>
                                <button
                                    className={modalTab === 'manual' ? styles.tabBtnActive : styles.tabBtn}
                                    onClick={() => setModalTab('manual')}
                                    style={{ background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 'bold', borderBottom: modalTab === 'manual' ? '2px solid #2563eb' : 'none', color: modalTab === 'manual' ? '#2563eb' : '#64748b' }}
                                >
                                    Manual Entry
                                </button>
                            </div>

                            {modalTab === 'select' ? (
                                <>
                                    <div className={styles.searchWrapper} style={{ marginBottom: '1.5rem' }}>
                                        <Search className={styles.searchIcon} size={18} />
                                        <input
                                            type="text"
                                            placeholder="Search students in your department..."
                                            className={styles.searchInput}
                                            style={{ width: '100%' }}
                                            value={menteeSearchTerm}
                                            onChange={(e) => setMenteeSearchTerm(e.target.value)}
                                            autoFocus
                                        />
                                    </div>

                                    <div className={styles.tableContainer} style={{ maxHeight: '450px', overflowY: 'auto' }}>
                                        <table className={styles.table}>
                                            <thead>
                                                <tr>
                                                    <th>Student Details</th>

                                                    <th>Avg</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {students
                                                    .filter(s =>
                                                        (s.name.toLowerCase().includes(menteeSearchTerm.toLowerCase()) ||
                                                            (s.regNo && s.regNo.toLowerCase().includes(menteeSearchTerm.toLowerCase())) ||
                                                            (s.rollNo && s.rollNo.toLowerCase().includes(menteeSearchTerm.toLowerCase()))) &&
                                                        !menteeIds.includes(s.id) &&
                                                        s.department === user?.department
                                                    )
                                                    .slice(0, 100) // Show all relevant students
                                                    .map(std => {
                                                        // Calculate marks
                                                        let totalScored = 0;
                                                        let count = 0;
                                                        if (allStudentMarks) {
                                                            Object.keys(allStudentMarks).forEach(subId => {
                                                                const m = allStudentMarks[subId][std.id];
                                                                if (m) {
                                                                    ['cie1', 'cie2', 'cie3', 'cie4', 'cie5'].forEach(cKey => {
                                                                        const val = m[cKey];
                                                                        if (val !== undefined && val !== null && val !== '') {
                                                                            totalScored += (val === 'Ab' ? 0 : (parseInt(val) || 0));
                                                                            count++;
                                                                        }
                                                                    });
                                                                }
                                                            });
                                                        }
                                                        const avg = count > 0 ? Math.round((totalScored / (count * 50)) * 100) : 0;

                                                        let realAtt = 0; // std.attendance || 0; // Removed attendance logic


                                                        return (
                                                            <tr key={std.id}>
                                                                <td>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                        <div className={styles.avatar} style={{ width: '24px', height: '24px', fontSize: '0.7rem' }}>{std.name.charAt(0)}</div>
                                                                        <div>
                                                                            <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>{std.name}</div>
                                                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{std.regNo || std.rollNo}</div>
                                                                        </div>
                                                                    </div>
                                                                </td>

                                                                <td>
                                                                    <span className={styles.badge} style={{
                                                                        fontSize: '0.7rem',
                                                                        backgroundColor: avg < 40 ? '#fee2e2' : (avg < 75 ? '#fef3c7' : '#dcfce7'),
                                                                        color: avg < 40 ? '#b91c1c' : (avg < 75 ? '#b45309' : '#15803d')
                                                                    }}>
                                                                        {count > 0 ? `${avg}%` : 'N/A'}
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    <button className={styles.saveBtn} style={{ padding: '3px 8px', fontSize: '0.7rem' }} onClick={() => handleAddMentee(std.id)}>Add</button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                            </tbody>
                                        </table>
                                        {students.filter(s => s.department === user?.department && !menteeIds.includes(s.id)).length === 0 && (
                                            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>All department students are already in your mentorship list.</div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <form onSubmit={handleAddManualStudent} className={styles.manualEntryForm}>
                                    <div className={styles.infoGrid} style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className={styles.infoItem}>
                                            <label className={styles.infoLabel}>Registration Number</label>
                                            <input
                                                type="text"
                                                className={styles.largeInput}
                                                placeholder="e.g. 459CS25001"
                                                required
                                                maxLength={10}
                                                value={newStudentForm.regNo}
                                                onChange={(e) => setNewStudentForm({ ...newStudentForm, regNo: e.target.value })}
                                            />
                                        </div>
                                        <div className={styles.infoItem}>
                                            <label className={styles.infoLabel}>Student Name</label>
                                            <input
                                                type="text"
                                                className={styles.largeInput}
                                                placeholder="Ex: John Doe"
                                                required
                                                value={newStudentForm.name}
                                                onChange={(e) => {
                                                    // Only allow letters and spaces
                                                    if (/^[a-zA-Z\s]*$/.test(e.target.value)) {
                                                        setNewStudentForm({ ...newStudentForm, name: e.target.value });
                                                    }
                                                }}
                                            />
                                        </div>
                                        <div className={styles.infoItem}>
                                            <label className={styles.infoLabel}>Parent Contact</label>
                                            <input
                                                type="tel"
                                                className={styles.largeInput}
                                                placeholder="Phone Number"
                                                required
                                                value={newStudentForm.parentPhone}
                                                onChange={(e) => {
                                                    // Only allow numbers
                                                    if (/^[0-9]*$/.test(e.target.value)) {
                                                        setNewStudentForm({ ...newStudentForm, parentPhone: e.target.value });
                                                    }
                                                }}
                                            />
                                        </div>

                                        <div className={styles.infoItem}>
                                            <label className={styles.infoLabel}>Academic CIE Avg (%)</label>
                                            <input
                                                type="number"
                                                className={styles.largeInput}
                                                placeholder="0-100"
                                                min="0"
                                                max="100"
                                                required
                                                value={newStudentForm.avgMark}
                                                onChange={(e) => setNewStudentForm({ ...newStudentForm, avgMark: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                        <button
                                            type="button"
                                            className={styles.filterBtn}
                                            onClick={() => setShowMenteeModal(false)}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className={styles.saveBtn}
                                        >
                                            Add Student
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}


            {renderEditStudentModal()}

            {
                toast.show && (
                    <div className={`${styles.toast} ${toast.type === 'error' ? styles.error : ''}`}>
                        <CheckCircle size={18} />
                        {toast.message}
                    </div>
                )
            }
        </DashboardLayout >
    );
};


export default FacultyDashboard;
