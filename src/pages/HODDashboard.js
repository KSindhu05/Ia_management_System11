import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API_BASE_URL from '../config/api';
import DashboardLayout from '../components/DashboardLayout';
import {
    LayoutDashboard, Users, FileText, CheckCircle, TrendingUp, BarChart2,
    AlertTriangle, Briefcase, Bell, Activity, Clock, Award,
    Edit, Save, LogOut, ShieldAlert, X, BookOpen, Layers, Megaphone, Calendar, MapPin, PenTool, Download, Mail, Trash2, Key, UserPlus, Upload, GitPullRequest, Eye
} from 'lucide-react';
import {
    departments, subjectsByDept, getStudentsByDept, englishMarks, mathsMarks,
    departmentStats, facultySubjects, facultyProfiles
} from '../utils/mockData';
import styles from './HODDashboard.module.css';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
    ArcElement, PointElement, LineElement, Filler
} from 'chart.js';
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2';
import logo from '../assets/college_logo.png';

ChartJS.register(
    CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
    ArcElement, PointElement, LineElement, Filler
);

// Local fallbacks for removed mock data
const hodTrendData = { labels: ['2022', '2023', '2024'], datasets: [{ label: 'Pass %', data: [75, 80, 85], borderColor: '#3b82f6', fill: false }] };
// atRiskStudents is now a state, see useState below
const facultyWorkload = [];
const branchPerformanceData = {};
const iaSubmissionStatus = { labels: ['Submitted', 'Pending'], datasets: [{ data: [70, 30], backgroundColor: ['#22c55e', '#ef4444'] }] };
const resourceRequests = [];
const hodData = {};
const hodBranchComparison = {};

const parseSubjects = (subjects) => {
    if (!subjects) return [];
    if (Array.isArray(subjects)) return subjects;
    if (typeof subjects === 'string') {
        return subjects.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
};

const HODDashboard = ({ isSpectator = false, spectatorDept = null }) => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedDept, setSelectedDept] = useState(user?.department || 'CSE');
    const [deptStudents, setDeptStudents] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [isMyDept, setIsMyDept] = useState(true);

    // Filter State for "All Students"
    const [studentFilterSem, setStudentFilterSem] = useState('all');
    const [studentFilterSec, setStudentFilterSec] = useState('all');
    const [selectedStudents, setSelectedStudents] = useState([]);

    const [selectedCieType, setSelectedCieType] = useState('all');

    // Spectator Mode Effect
    useEffect(() => {
        if (isSpectator && spectatorDept) {
            setSelectedDept(spectatorDept);
            setIsMyDept(true); // Principal can view any dept
        }
    }, [isSpectator, spectatorDept]);

    const [editingMarks, setEditingMarks] = useState({});
    const [viewingSubject, setViewingSubject] = useState(null);

    // Student Profile State
    const [selectedStudentProfile, setSelectedStudentProfile] = useState(null);
    const [studentMarksProfile, setStudentMarksProfile] = useState([]);
    const [showProfileModal, setShowProfileModal] = useState(false);

    // API State
    const [subjects, setSubjects] = useState([]);
    const [students, setStudents] = useState([]);
    const [subjectMarks, setSubjectMarks] = useState({});
    const [analytics, setAnalytics] = useState(null);
    const [subjectMarksData, setSubjectMarksData] = useState({});
    const [performanceSubjectId, setPerformanceSubjectId] = useState('all');
    const [cieTrendData, setCieTrendData] = useState([0, 0, 0, 0, 0]);
    const [allSubjectPerformance, setAllSubjectPerformance] = useState([]);

    // Syllabus Form State
    const [syllabusForm, setSyllabusForm] = useState({ subjectId: '', cieNumber: '1', syllabus: '' });
    const [syllabusLoading, setSyllabusLoading] = useState(false);

    // Announcement State
    const [departmentAnnouncements, setDepartmentAnnouncements] = useState([]);
    const [facultyList, setFacultyList] = useState([]);
    const [showAddFacultyModal, setShowAddFacultyModal] = useState(false);
    const [showEditSelection, setShowEditSelection] = useState(false);
    const [editingFaculty, setEditingFaculty] = useState(null);
    const [facultyForm, setFacultyForm] = useState({
        fullName: '',
        username: '',
        email: '',
        password: 'password123',
        designation: 'Assistant Professor',
        semester: '',
        section: '',
        subjects: ''
    });

    // CIE Schedule Form State
    const [scheduleForm, setScheduleForm] = useState({
        cieNumber: 1,
    });
    const [editingScheduleId, setEditingScheduleId] = useState(null); // Track editing state

    // Subject Editing State
    const [editingSubject, setEditingSubject] = useState(null);

    // Pending Approvals State
    const [pendingApprovals, setPendingApprovals] = useState([]);
    const [approvalLoading, setApprovalLoading] = useState(false);
    const [expandedApprovals, setExpandedApprovals] = useState({});

    // Notification State
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Student Management State
    const [showAddStudentModal, setShowAddStudentModal] = useState(false);
    const [studentForm, setStudentForm] = useState({
        regNo: '', name: '', email: '', phone: '', parentPhone: '',
        semester: '1', section: 'A', password: 'password123'
    });

    // Reset Password State
    const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
    const [resetTarget, setResetTarget] = useState(null); // { username, fullName, role }
    const [newPassword, setNewPassword] = useState('');

    // Overview data (real from API)
    const [departmentAlerts, setDepartmentAlerts] = useState([]);
    const [atRiskStudents, setAtRiskStudents] = useState([]);
    const [showAllAlerts, setShowAllAlerts] = useState(false);
    const [selectedSemester, setSelectedSemester] = useState('all');
    const [hodGradeDistribution, setHodGradeDistribution] = useState({
        labels: ['A', 'B', 'C', 'D', 'F'],
        datasets: [{ data: [0, 0, 0, 0, 0], backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#6b7280'] }]
    });

    const toggleExpansion = (index) => {
        setExpandedApprovals(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };


    // Faculty Management State (Restored)
    const [viewingFaculty, setViewingFaculty] = useState(null);
    const [messagingFaculty, setMessagingFaculty] = useState(null);
    const [messageText, setMessageText] = useState('');

    const handleViewDashboard = (faculty) => {
        setViewingFaculty(faculty);
    };

    const handleMessage = (faculty) => {
        setMessagingFaculty(faculty);
        setMessageText('');
    };

    const sendMessage = async () => {
        if (!messageText.trim() || !messagingFaculty) return;

        try {
            const token = user?.token;
            const headers = {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            };

            const response = await fetch(`${API_BASE_URL}/notifications`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    userId: messagingFaculty.id,
                    message: messageText,
                    type: 'INFO', // Changed from MESSAGE to INFO to match backend ENUM
                    category: 'HOD'
                })
            });

            if (response.ok) {
                alert(`Message sent to ${messagingFaculty.fullName || messagingFaculty.username}`);
                setMessagingFaculty(null);
                setMessageText('');
            } else {
                const err = await response.text();
                alert('Failed to send message: ' + err);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Error sending message');
        }
    };

    const [messageRecipientType, setMessageRecipientType] = useState('FACULTY'); // FACULTY, STUDENT, PRINCIPAL
    const [newMessageText, setNewMessageText] = useState('');

    const handleSendNewMessage = async () => {
        if (!newMessageText.trim()) {
            alert('Please enter a message.');
            return;
        }

        try {
            const token = user?.token;
            const headers = {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            };

            const sendBroadcast = async (role) => {
                const payload = {
                    targetRole: role, // Backend expects 'targetRole' not 'recipientType'
                    message: newMessageText,
                    senderId: user?.id,
                    department: selectedDept
                };

                return fetch(`${API_BASE_URL}/notifications/broadcast`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(payload)
                });
            };

            let responses = [];
            if (messageRecipientType === 'BOTH') {
                // Send to both Faculty and Students
                const res1 = sendBroadcast('FACULTY');
                const res2 = sendBroadcast('STUDENT');
                responses = await Promise.all([res1, res2]);
            } else {
                // Send to specifically selected role
                const res = await sendBroadcast(messageRecipientType);
                responses = [res];
            }

            // Check if all requests were successful
            const allOk = responses.every(r => r.ok);

            if (allOk) {
                const groupName = messageRecipientType === 'BOTH' ? 'Students and Faculty' : `${messageRecipientType.toLowerCase()}s`;
                alert(`Message sent to all ${groupName}!`);
                setNewMessageText('');
            } else {
                console.error('Some messages failed');
                // Log details of failed requests
                responses.forEach(async (r, idx) => {
                    if (!r.ok) {
                        const err = await r.text();
                        console.error(`Request ${idx + 1} failed: ${r.status} ${r.statusText}`, err);
                    }
                });
                alert('Error sending message to some groups. Please check console for details.');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Error sending message');
        }
    };

    const menuItems = [
        { label: 'Overview', path: '#overview', icon: <LayoutDashboard size={20} />, isActive: activeTab === 'overview', onClick: () => setActiveTab('overview') },
        { label: 'CIE Schedule', path: '#cie-schedule', icon: <Calendar size={20} />, isActive: activeTab === 'cie-schedule', onClick: () => setActiveTab('cie-schedule') },
        { label: 'Add Subjects', path: '#syllabus', icon: <BookOpen size={20} />, isActive: activeTab === 'syllabus', onClick: () => setActiveTab('syllabus') },
        { label: 'IA Monitoring', path: '#monitoring', icon: <Activity size={20} />, isActive: activeTab === 'monitoring', onClick: () => setActiveTab('monitoring') },
        { label: 'Student Performance', path: '#performance', icon: <TrendingUp size={20} />, isActive: activeTab === 'performance', onClick: () => setActiveTab('performance') },
        { label: 'Faculty Management', path: '#faculty', icon: <Briefcase size={20} />, isActive: activeTab === 'faculty', onClick: () => setActiveTab('faculty') },
        { label: 'Faculty Requests', path: '#faculty-requests', icon: <GitPullRequest size={20} />, isActive: activeTab === 'faculty-requests', onClick: () => setActiveTab('faculty-requests') },
        { label: 'All Students', path: '#all-students', icon: <Users size={20} />, isActive: activeTab === 'all-students', onClick: () => setActiveTab('all-students') },
        { label: 'Student Management', path: '#student-mgmt', icon: <UserPlus size={20} />, isActive: activeTab === 'student-mgmt', onClick: () => setActiveTab('student-mgmt') },
        { label: 'IA Approval Panel', path: '#approvals', icon: <CheckCircle size={20} />, isActive: activeTab === 'approvals', onClick: () => setActiveTab('approvals') },
        { label: 'Update Marks', path: '#marks', icon: <PenTool size={20} />, isActive: activeTab === 'update-marks', onClick: () => setActiveTab('update-marks') },
        { label: 'Notifications', path: '#notifications', icon: <Bell size={20} />, isActive: activeTab === 'notifications', onClick: () => setActiveTab('notifications') },
    ];


    const API_BASE = `${API_BASE_URL}/marks`;

    const handleAddFaculty = async (e) => {
        if (e) e.preventDefault();

        const data = {
            fullName: facultyForm.fullName,
            username: facultyForm.username,
            email: facultyForm.email,
            designation: facultyForm.designation,
            department: selectedDept,
        };
        if (!editingFaculty && facultyForm.password) {
            data.password = facultyForm.password;
        }

        try {
            const token = user?.token;
            const headers = { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) };
            const method = editingFaculty ? 'PUT' : 'POST';
            const url = editingFaculty
                ? `${API_BASE_URL}/hod/faculty/${editingFaculty.id}`
                : `${API_BASE_URL}/hod/faculty`;

            const response = await fetch(url, {
                method,
                headers,
                body: JSON.stringify(data)
            });

            if (response.ok) {
                alert(editingFaculty ? 'Faculty updated successfully!' : 'Faculty added successfully!');
                setShowAddFacultyModal(false);
                setEditingFaculty(null);
                setFacultyForm({ fullName: '', username: '', email: '', password: 'password123', designation: 'Assistant Professor', semester: '', section: '', subjects: '', cieRole: '' });
                fetchFaculty(); // Refresh the list
            } else {
                const errData = await response.json().catch(() => ({ message: 'Error processing faculty' }));
                const detailMsg = errData.details ? `\n- ${errData.details.join('\n- ')}` : '';
                alert(`Failed to process faculty: ${errData.message}${detailMsg}`);
            }
        } catch (error) {
            console.error(error);
            alert('Error processing faculty');
        }
    };

    const handleEditFaculty = (fac) => {
        setEditingFaculty(fac);
        setFacultyForm({
            fullName: fac.fullName || '',
            username: fac.username || '',
            email: fac.email || '',
            password: '',
            designation: fac.designation || 'Assistant Professor',
            cieRole: fac.cieRole || '' // Load existing cieRole
        });
        setShowAddFacultyModal(true);
    };

    const handleDeleteFaculty = async (facId) => {
        if (!window.confirm(`Are you sure you want to remove this faculty from ${selectedDept} department? They will keep their assignments in other departments.`)) return;

        try {
            const token = user?.token;
            const headers = { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) };
            const response = await fetch(`${API_BASE_URL}/hod/faculty/${facId}?department=${encodeURIComponent(selectedDept)}`, {
                method: 'DELETE',
                headers
            });

            if (response.ok) {
                alert(`Faculty removed from ${selectedDept} successfully`);
                fetchFaculty(); // Refresh the list
            } else {
                const err = await response.json().catch(() => ({ message: 'Error removing faculty' }));
                const detailMsg = err.details ? `\nDetails: ${err.details}` : '';
                const tableMsg = err.table ? `\nTable: ${err.table}` : '';
                alert(`Failed to remove faculty: ${err.message}${detailMsg}${tableMsg}`);
            }
        } catch (error) {
            console.error(error);
            alert('Error removing faculty');
        }
    };

    const fetchFaculty = async () => {
        if (!isMyDept || !selectedDept || !user?.token) return;
        try {
            const headers = { 'Authorization': `Bearer ${user.token}` };
            const response = await fetch(`${API_BASE_URL}/hod/faculty?department=${selectedDept}`, { headers });
            if (response.ok) {
                const data = await response.json();
                setFacultyList(data);
            }
        } catch (e) {
            console.error("Failed to fetch faculty list", e);
        }
    };

    // Fetch faculty list on mount (needed for overview stat card)
    useEffect(() => {
        fetchFaculty();
    }, [isMyDept, selectedDept, user]);

    // Fetch overview data (real alerts, grade distribution)
    useEffect(() => {
        if (isMyDept && selectedDept && user?.token) {
            const fetchOverview = async () => {
                try {
                    const headers = { 'Authorization': `Bearer ${user.token}` };
                    const response = await fetch(`${API_BASE_URL}/hod/overview?department=${selectedDept}`, { headers });
                    if (response.ok) {
                        const data = await response.json();
                        if (data.alerts) setDepartmentAlerts(data.alerts);
                        if (data.atRiskStudents) setAtRiskStudents(data.atRiskStudents);
                        if (data.gradeDistribution) {
                            setHodGradeDistribution({
                                labels: data.gradeDistribution.labels,
                                datasets: [{
                                    data: data.gradeDistribution.data,
                                    backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#6b7280']
                                }]
                            });
                        }
                        // Populate analytics from overview data
                        setAnalytics({
                            average: data.deptAverage || 0,
                            passPercentage: data.passPercentage || 0,
                            atRiskCount: data.atRiskCount || 0,
                            totalStudents: data.totalStudents || 0
                        });
                    }
                } catch (e) {
                    console.error("Failed to fetch overview data", e);
                }
            };
            fetchOverview();
        }
    }, [isMyDept, selectedDept, user]);

    // Fetch Subject Marks Data for IA Monitoring
    useEffect(() => {
        if ((activeTab === 'monitoring' || activeTab === 'faculty') && isMyDept && subjects.length > 0 && deptStudents.length > 0) {
            const fetchSubjectMarks = async () => {
                try {
                    const token = user?.token;
                    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                    const marksDataBySubject = {};

                    for (const subject of subjects) {
                        try {
                            const response = await fetch(`${API_BASE_URL}/marks/subject/${subject.id}`, { headers });
                            if (response.ok) {
                                const marksData = await response.json();
                                marksDataBySubject[subject.name] = marksData;
                            }
                        } catch (e) {
                            console.error(`Failed to fetch marks for ${subject.name}`, e);
                        }
                    }
                    setSubjectMarksData(marksDataBySubject);
                } catch (e) {
                    console.error("Failed to fetch subject marks", e);
                }
            };
            fetchSubjectMarks();
        }
    }, [activeTab, isMyDept, subjects, deptStudents]);

    // Fetch Notifications
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const token = user?.token;
                if (!token) return;
                const headers = { 'Authorization': `Bearer ${token}` };
                const response = await fetch(`${API_BASE_URL}/cie/hod/notifications`, { headers });
                if (response.ok) {
                    const data = await response.json();
                    setNotifications(data);
                    setUnreadCount(data.filter(n => !n.isRead).length);
                }
            } catch (e) {
                console.error("Failed to fetch notifications", e);
            }
        };
        fetchNotifications();
        fetchNotifications();
    }, [user]);

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
                alert('Notifications cleared successfully');
            } else {
                alert('Failed to clear notifications');
            }
        } catch (e) {
            console.error("Failed to clear notifications", e);
            alert('Error clearing notifications');
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
                // Recalculate unread count if needed
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (e) {
            console.error("Failed to delete notification", e);
        }
    };

    // Fetch pending approvals when tab is active
    useEffect(() => {
        if (activeTab === 'approvals' && isMyDept) {
            const fetchPendingApprovals = async () => {
                setApprovalLoading(true);
                try {
                    const token = user?.token;
                    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                    const response = await fetch(`${API_BASE_URL}/marks/pending?department=${selectedDept}`, { headers });
                    if (response.ok) {
                        const rawMarks = await response.json();
                        // Group raw CieMark records by subject + cieType
                        const grouped = {};
                        rawMarks.forEach(mark => {
                            const subjectName = mark.subject?.name || 'Unknown Subject';
                            const cieType = mark.cieType || 'CIE1';
                            const key = `${mark.subject?.id || 0}_${cieType}`;
                            if (!grouped[key]) {
                                grouped[key] = {
                                    subjectId: mark.subject?.id,
                                    subjectName: subjectName,
                                    iaType: cieType,
                                    facultyName: mark.subject?.instructorName || 'Unknown',
                                    studentCount: 0,
                                    marks: []
                                };
                            }
                            grouped[key].marks.push({
                                studentId: mark.student?.id,
                                regNo: mark.student?.regNo || '-',
                                studentName: mark.student?.name || '-',
                                totalScore: mark.marks || 0,
                                attendancePercentage: mark.attendancePercentage != null ? mark.attendancePercentage : null
                            });
                            grouped[key].studentCount = grouped[key].marks.length;
                        });
                        setPendingApprovals(Object.values(grouped));
                    }
                } catch (e) {
                    console.error("Failed to fetch pending approvals", e);
                } finally {
                    setApprovalLoading(false);
                }
            };
            fetchPendingApprovals();
        }
    }, [activeTab, isMyDept, selectedDept]);

    // Fetch Subject Trend Data for Performance Tab
    // Unified Performance data fetching
    useEffect(() => {
        const fetchPerformanceData = async () => {
            try {
                const token = user?.token;
                const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                // Combined fetch from the stable overview endpoint
                const response = await fetch(`${API_BASE_URL}/hod/overview?department=${selectedDept}`, { headers });

                if (response.ok) {
                    const data = await response.json();

                    // 1. Update Trend Data (Dept or Subject)
                    if (performanceSubjectId === 'all') {
                        setCieTrendData([
                            data.cieTrend?.CIE1 || 0,
                            data.cieTrend?.CIE2 || 0,
                            data.cieTrend?.CIE3 || 0,
                            data.cieTrend?.CIE4 || 0,
                            data.cieTrend?.CIE5 || 0
                        ]);
                    } else {
                        // For a specific subject, find it in the list
                        const sub = data.subjectPerfList?.find(s => String(s.id) === String(performanceSubjectId));
                        if (sub) {
                            setCieTrendData([
                                sub.averages.CIE1 || 0,
                                sub.averages.CIE2 || 0,
                                sub.averages.CIE3 || 0,
                                sub.averages.CIE4 || 0,
                                sub.averages.CIE5 || 0
                            ]);
                        }
                    }

                    // 2. Update subject performance list
                    if (data.subjectPerfList) {
                        setAllSubjectPerformance(data.subjectPerfList);
                    }
                }
            } catch (e) {
                console.error("Failed to fetch performance data", e);
            }
        };

        if (activeTab === 'performance' && isMyDept && selectedDept) {
            fetchPerformanceData();
        }
    }, [activeTab, performanceSubjectId, isMyDept, selectedDept, user]);

    useEffect(() => {
        const userDept = user?.department || 'CSE'; // Get from user profile
        const isAuthorized = selectedDept === userDept; // For now assuming admin/HOD access
        setIsMyDept(true); // Allow viewing specific departments

        const fetchStudents = async () => {
            try {
                const token = user?.token;
                const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                const response = await fetch(`${API_BASE_URL}/student/all?department=${selectedDept}`, { headers });
                if (response.ok) {
                    const data = await response.json();

                    // --- GLOBAL SYNC: Check for updates ---
                    const globalUpdates = JSON.parse(localStorage.getItem('global_student_updates') || '{}');
                    const updatedData = data.map(s => {
                        const updates = globalUpdates[s.id];
                        return updates ? { ...s, ...updates } : s;
                    });

                    setDeptStudents(updatedData);
                    setStudents(updatedData);
                } else {
                    setDeptStudents([]);
                    setStudents([]);
                }
            } catch (e) {
                console.error("Failed to fetch students", e);
            }
        };

        if (selectedDept) {
            fetchStudents();
        } else {
            setDeptStudents([]); setStudents([]); setSubjects([]); setSelectedSubject(null);
        }
    }, [selectedDept, user]);




    useEffect(() => {
        if (selectedSubject && selectedSubject.id) {
            const fetchMarks = async () => {
                try {
                    const token = user?.token;
                    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                    const response = await fetch(`${API_BASE_URL}/marks/subject/${selectedSubject.id}`, { headers });

                    if (response.ok) {
                        const marksData = await response.json();
                        console.log('Fetched Marks for Subject ' + selectedSubject.id, marksData);
                        const marksMap = {};

                        // Populate editingMarks from DB data
                        marksData.forEach(m => {
                            if (!marksMap[m.studentId]) marksMap[m.studentId] = {};
                            // Treat 0 marks on PENDING status as null (not yet entered)
                            const markValue = (m.marks === 0 || m.marks === null) && m.status === 'PENDING' ? null : m.marks;
                            if (m.cieType === 'CIE1') { marksMap[m.studentId].cie1 = markValue; marksMap[m.studentId].cie1Att = m.attendancePercentage; }
                            if (m.cieType === 'CIE2') { marksMap[m.studentId].cie2 = markValue; marksMap[m.studentId].cie2Att = m.attendancePercentage; }
                            if (m.cieType === 'CIE3') { marksMap[m.studentId].cie3 = markValue; marksMap[m.studentId].cie3Att = m.attendancePercentage; }
                            if (m.cieType === 'CIE4') { marksMap[m.studentId].cie4 = markValue; marksMap[m.studentId].cie4Att = m.attendancePercentage; }
                            if (m.cieType === 'CIE5') { marksMap[m.studentId].cie5 = markValue; marksMap[m.studentId].cie5Att = m.attendancePercentage; }
                        });
                        setEditingMarks(marksMap);
                    }
                } catch (e) {
                    console.error("Failed to fetch marks for editing", e);
                }
            };
            fetchMarks();
        }
    }, [selectedSubject]);

    useEffect(() => {
        if (isMyDept && selectedDept) {
            const fetchAnnouncements = async () => {
                try {
                    const token = user?.token;
                    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                    const response = await fetch(`${API_BASE_URL}/cie/hod/announcements`, { headers });
                    if (response.ok) {
                        const data = await response.json();
                        // Deduplicate by id to prevent duplicate schedule entries
                        const unique = data.filter((item, index, self) =>
                            index === self.findIndex(t => t.id === item.id)
                        );
                        setDepartmentAnnouncements(unique);
                    }
                    else {
                        setDepartmentAnnouncements([{ id: 1, cieNumber: '1', scheduledDate: '2025-03-10', subject: { name: 'Python', code: '20CS31' }, faculty: { username: 'Wahida Banu' }, status: 'SCHEDULED' }]);
                    }
                } catch (e) { console.error("Failed to fetch announcements", e); }
            };
            fetchAnnouncements();
        }
    }, [isMyDept, selectedDept]);

    const handleScheduleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        data.cieNumber = scheduleForm.cieNumber;
        data.senderId = user?.username; // Add senderId for robust auth handling


        try {
            const token = user?.token;
            const headers = { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) };
            const baseUrl = API_BASE.replace('/marks', '/hod');

            let response;
            if (editingScheduleId) {
                // UPDATE Existing Schedule
                response = await fetch(`${API_BASE_URL}/cie/announcements/${editingScheduleId}`, {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify(data)
                });
            } else {
                // CREATE New Schedule
                response = await fetch(`${API_BASE_URL}/cie/announcements?subjectId=${data.subjectId}`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(data)
                });
            }

            if (response.ok) {
                alert(editingScheduleId ? 'CIE Schedule Updated Successfully!' : 'CIE Schedule Published Successfully!');
                setActiveTab('cie-schedule');
                setEditingScheduleId(null); // Reset edit mode
                window.location.reload();
            } else { alert('Failed to publish schedule'); }
        } catch (error) { console.error(error); alert('Error publishing schedule'); }
    };

    const handleEditSchedule = (schedule) => {
        setEditingScheduleId(schedule.id);
        setScheduleForm(prev => ({ ...prev, cieNumber: schedule.cieNumber }));

        // Populate form fields (Need to access DOM or controlled inputs ideally, but simpler here for now)
        // Since the form uses uncontrolled inputs with name attributes, we can try to key the form or use state.
        // For now, let's just use state for the controlled parts and warn user they might need to re-enter if not fully controlled.
        // BETTER APPROACH: Switch to fully controlled form or Key the form. 
        // Let's use document.getElementsByName since it is quick for this refactor without rewriting entire form to controlled components.
        setTimeout(() => {
            const subjectSelect = document.querySelector('select[name="subjectId"]');
            const dateInput = document.querySelector('input[name="scheduledDate"]');
            const timeInput = document.querySelector('input[name="startTime"]');
            const durationInput = document.querySelector('input[name="durationMinutes"]');
            const roomInput = document.querySelector('input[name="examRoom"]');
            const instructionsInput = document.querySelector('textarea[name="integrationInstructions"]');

            if (subjectSelect) subjectSelect.value = schedule.subject?.id || '';
            if (dateInput) dateInput.value = schedule.scheduledDate || '';
            if (timeInput) timeInput.value = schedule.startTime || '';
            if (durationInput) durationInput.value = schedule.durationMinutes || 60;
            if (roomInput) roomInput.value = schedule.examRoom || '';
            if (instructionsInput) instructionsInput.value = schedule.instructions || '';
        }, 100);

        // Scroll to form
        document.querySelector('#scheduleFormSection')?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleDeleteSchedule = async (id) => {
        if (!window.confirm('Are you sure you want to delete this schedule? This cannot be undone.')) return;
        try {
            const token = user?.token;
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            const response = await fetch(`${API_BASE_URL}/cie/announcements/${id}`, {
                method: 'DELETE',
                headers
            });

            if (response.ok) {
                alert('Schedule deleted successfully');
                setDepartmentAnnouncements(prev => prev.filter(a => a.id !== id));
            } else {
                alert('Failed to delete schedule');
            }
        } catch (e) {
            console.error("Failed to delete schedule", e);
            alert('Error deleting schedule');
        }
    };

    const cancelEdit = () => {
        setEditingScheduleId(null);
        document.querySelector('form').reset();
    };

    useEffect(() => {
        if (isMyDept) {
            const fetchSubjects = async () => {
                try {
                    const token = user?.token;
                    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                    // Removed unused localhost URL
                    const response = await fetch(`${API_BASE_URL}/subjects/department/${selectedDept}`, { headers });
                    if (response.ok) {
                        const data = await response.json();
                        setSubjects(data);
                        // Auto-select first subject for update-marks tab
                        if (activeTab === 'update-marks' && data.length > 0 && !selectedSubject) {
                            setSelectedSubject(data[0]);
                        }
                    }
                } catch (e) { console.error("Failed to fetch subjects", e); }
            };
            fetchSubjects();
        }
    }, [activeTab, isMyDept, selectedDept]);

    const commonOptions = { responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } }, maintainAspectRatio: false };
    const doughnutOptions = { responsive: true, plugins: { legend: { position: 'right' } }, maintainAspectRatio: false };

    const handleLogout = () => { window.location.href = '/'; };

    const handleMarkChange = (studentId, field, value) => {
        if (value === '') {
            setEditingMarks(prev => ({ ...prev, [studentId]: { ...prev[studentId], [field]: '' } }));
            return;
        }
        let numValue = parseInt(value, 10);
        if (isNaN(numValue)) return;
        const max = field.includes('Att') ? 100 : 50; // Each CIE has max 50 marks, Att max 100
        if (numValue < 0) numValue = 0; if (numValue > max) numValue = max;
        setEditingMarks(prev => ({ ...prev, [studentId]: { ...prev[studentId], [field]: numValue } }));
    };

    const saveMarks = async () => {
        if (!selectedSubject) return;

        const payload = [];
        Object.keys(editingMarks).forEach(studentId => {
            const marks = editingMarks[studentId];
            const sid = Number(studentId);
            ['cie1', 'cie2', 'cie3', 'cie4', 'cie5'].forEach(key => {
                const val = marks[key];
                const attValStr = marks[key + 'Att'];
                const attVal = attValStr !== undefined && attValStr !== '' && attValStr !== null ? Number(attValStr) : null;

                if ((val === undefined || val === null || val === '') && attVal === null) return; // Skip if both empty

                payload.push({
                    studentId: sid,
                    subjectId: selectedSubject.id,
                    iaType: key.toUpperCase(),
                    co1: val !== undefined && val !== null && val !== '' ? Number(val) : null,
                    co2: 0,
                    attendancePercentage: attVal
                });
            });
        });

        if (payload.length === 0) {
            alert("No changes to save.");
            return;
        }

        try {
            const token = user?.token;
            const headers = { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) };
            const response = await fetch(`${API_BASE_URL}/marks/update/batch`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                alert('Marks updated successfully!');
            } else {
                const err = await response.text();
                alert('Failed to update marks: ' + err);
            }
        } catch (e) {
            console.error(e);
            alert('Error updating marks');
        }
    };

    const handleApproveMarks = async (subjectId, iaType) => {
        if (!window.confirm(`Are you sure you want to APPROVE marks for ${iaType}? This will lock these marks.`)) return;
        try {
            const token = user?.token;
            const headers = { 'Authorization': `Bearer ${token}` };
            const response = await fetch(`${API_BASE_URL}/marks/approve?subjectId=${subjectId}&iaType=${iaType}`, {
                method: 'POST',
                headers
            });
            if (response.ok) {
                alert('Marks approved successfully!');
                setPendingApprovals(prev => prev.filter(p => !(p.subjectId === subjectId && p.iaType === iaType)));
            } else {
                const err = await response.text();
                alert('Failed to approve: ' + err);
            }
        } catch (e) {
            console.error(e);
            alert('Error approving marks');
        }
    };

    const handleRejectMarks = async (subjectId, iaType) => {
        if (!window.confirm(`Are you sure you want to REJECT marks for ${iaType}? Faculty will need to resubmit.`)) return;
        try {
            const token = user?.token;
            const headers = { 'Authorization': `Bearer ${token}` };
            const response = await fetch(`${API_BASE_URL}/marks/reject?subjectId=${subjectId}&iaType=${iaType}`, {
                method: 'POST',
                headers
            });
            if (response.ok) {
                alert('Marks rejected. Faculty has been notified.');
                setPendingApprovals(prev => prev.filter(p => !(p.subjectId === subjectId && p.iaType === iaType)));
            } else {
                const err = await response.text();
                alert('Failed to reject: ' + err);
            }
        } catch (e) {
            console.error(e);
            alert('Error rejecting marks');
        }
    };

    const handleUnlockMarks = async (subjectId, iaType, subjectName) => {
        const reason = prompt(`Why are you unlocking ${subjectName} ${iaType} marks?\n(Optional - press OK to skip)`);

        if (reason === null) return; // User clicked Cancel

        if (!window.confirm(`Are you sure you want to UNLOCK ${subjectName} ${iaType} marks?\n\nThis will change the status from APPROVED to PENDING, allowing faculty to edit them again.`)) {
            return;
        }

        try {
            const token = user?.token;
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };

            const response = await fetch(`${API_BASE_URL}/marks/unlock`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    subjectId,
                    iaType,
                    reason: reason || null
                })
            });

            if (response.ok) {
                const result = await response.json();
                alert(`Success: ${result.message || 'Marks unlocked successfully!'}\n\nFaculty can now edit these marks.`);
                // Reload page to show updated status
                window.location.reload();
            } else {
                const err = await response.json();
                console.error('Unlock failed response:', err);
                alert(`Failed to unlock: ${err.message || 'Unknown error'} (Status: ${response.status})`);
            }
        } catch (e) {
            console.error('Unlock error:', e);
            alert(`Error unlocking marks: ${e.message}. Check console for details.`);
        }
    };


    const AccessDeniedView = () => (
        <div className={styles.accessDeniedContainer}>
            <div className={styles.deniedContent}>
                <ShieldAlert size={64} className={styles.deniedIcon} />
                <h2>Restricted Access</h2>
                <p>You are not authorized to view or modify data for the <strong>{departments.find(d => d.id === selectedDept)?.name}</strong> department.</p>
                <div className={styles.warningNote}>
                    <AlertTriangle size={16} />
                    <span>This action has been logged. Please switch back to your assigned department (Computer Science).</span>
                </div>
                <button className={styles.backBtn} onClick={() => setSelectedDept(user?.department || 'CSE')}>Return to My Department</button>
            </div>
        </div>
    );

    const fetchStudentProfile = async (student) => {
        try {
            setSelectedStudentProfile(student);
            setStudentMarksProfile([]);
            setShowProfileModal(true);

            const token = user?.token;
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            const response = await fetch(`${API_BASE_URL}/marks/student/${student.id}`, { headers });

            if (response.ok) {
                const data = await response.json();
                setStudentMarksProfile(data);
            }
        } catch (e) {
            console.error("Failed to fetch student profile marks", e);
        }
    };

    // ========== STUDENT MANAGEMENT HANDLERS ==========
    const handleAddStudent = async (e) => {
        if (e) e.preventDefault();
        const data = { ...studentForm, department: selectedDept };

        try {
            const token = user?.token;
            const headers = { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) };
            const response = await fetch(`${API_BASE_URL}/hod/students`, {
                method: 'POST', headers, body: JSON.stringify(data)
            });

            if (response.ok) {
                alert('Student created successfully! They can now login with their Reg No.');
                setShowAddStudentModal(false);
                setStudentForm({ regNo: '', name: '', email: '', phone: '', parentPhone: '', semester: '1', section: 'A', password: 'password123' });
                // Refresh student list
                window.location.reload();
            } else {
                const err = await response.json().catch(() => ({ message: 'Error creating student' }));
                alert(`Failed: ${err.message}`);
            }
        } catch (error) {
            console.error(error);
            alert('Error creating student');
        }
    };

    const handleDeleteStudent = async (regNo) => {
        if (!window.confirm(`Are you sure you want to delete student ${regNo}? This will remove their login account and all data.`)) return;
        try {
            const token = user?.token;
            const headers = { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) };
            const response = await fetch(`${API_BASE_URL}/hod/students/${regNo}`, { method: 'DELETE', headers });
            if (response.ok) {
                alert('Student deleted successfully');
                window.location.reload();
            } else {
                alert('Failed to delete student');
            }
        } catch (e) {
            console.error(e);
            alert('Error deleting student');
        }
    };

    const openResetPasswordModal = (username, fullName, role) => {
        setResetTarget({ username, fullName, role });
        setNewPassword('');
        setShowResetPasswordModal(true);
    };

    const handleResetPassword = async () => {
        if (!resetTarget || !newPassword || newPassword.length < 4) {
            alert('Please enter a password with at least 4 characters.');
            return;
        }
        try {
            const token = user?.token;
            const headers = { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) };
            const response = await fetch(`${API_BASE_URL}/hod/credentials/reset`, {
                method: 'PUT', headers,
                body: JSON.stringify({ username: resetTarget.username, newPassword })
            });
            if (response.ok) {
                alert(`Password reset successfully for ${resetTarget.fullName || resetTarget.username}`);
                setShowResetPasswordModal(false);
            } else {
                const err = await response.json().catch(() => ({ message: 'Error resetting password' }));
                alert(`Failed: ${err.message}`);
            }
        } catch (e) {
            console.error(e);
            alert('Error resetting password');
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!window.confirm(`Are you sure you want to upload "${file.name}"? This will add students to the ${selectedDept} department.`)) {
            e.target.value = null; // Reset input
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('department', selectedDept);

        try {
            const token = user?.token;
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {}; // No Content-Type for FormData, browser sets it

            // Show loading state if desired (optional)
            // setClientLoading(true); 

            const response = await fetch(`${API_BASE_URL}/hod/students/upload`, {
                method: 'POST',
                headers,
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                let msg = result.message;
                if (result.added !== undefined) msg += `\n\n✅ Added: ${result.added}`;
                if (result.skipped !== undefined) msg += `\n⚠️ Skipped: ${result.skipped}`;
                if (result.errors && result.errors.length > 0) {
                    msg += `\n\n❌ Errors:\n${result.errors.slice(0, 5).join('\n')}`;
                    if (result.errors.length > 5) msg += `\n...and ${result.errors.length - 5} more errors.`;
                }
                alert(msg);
                window.location.reload();
            } else {
                alert(`Upload Failed: ${result.message}`);
            }
        } catch (error) {
            console.error(error);
            alert('Error uploading file');
        } finally {
            e.target.value = null; // Reset input
        }
    };

    const toggleSelectStudent = (regNo) => {
        if (selectedStudents.includes(regNo)) {
            setSelectedStudents(selectedStudents.filter(id => id !== regNo));
        } else {
            setSelectedStudents([...selectedStudents, regNo]);
        }
    };

    const toggleSelectAll = (filteredStudents) => {
        const allRegNos = filteredStudents.map(s => s.regNo);
        const allSelected = allRegNos.every(r => selectedStudents.includes(r));

        if (allSelected) {
            // Deselect all visible
            setSelectedStudents(selectedStudents.filter(id => !allRegNos.includes(id)));
        } else {
            // Select all visible (merge unique)
            const newSelection = [...new Set([...selectedStudents, ...allRegNos])];
            setSelectedStudents(newSelection);
        }
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Are you sure you want to delete ${selectedStudents.length} students? This action cannot be undone.`)) return;

        const headers = {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
        };

        try {
            const response = await fetch(`${API_BASE_URL}/hod/students/bulk`, {
                method: 'DELETE',
                headers,
                body: JSON.stringify(selectedStudents)
            });

            const result = await response.json();
            if (response.ok) {
                alert(result.message);
                setSelectedStudents([]);
                // Reload data
                window.location.reload();
            } else {
                alert("Failed to delete students: " + result.message);
            }
        } catch (error) {
            console.error(error);
            alert("Error deleting students");
        }
    };

    const renderStudentManagement = () => {
        // Calculate available sections
        const allSections = [...new Set(deptStudents.map(s => s.section || 'A'))].sort();

        const filteredStudents = deptStudents.filter(std => {
            const semMatch = studentFilterSem === 'all' || std.semester == studentFilterSem;
            const secMatch = studentFilterSec === 'all' || (std.section && std.section.toUpperCase() === studentFilterSec);
            return semMatch && secMatch;
        });

        const allVisibleSelected = filteredStudents.length > 0 && filteredStudents.every(s => selectedStudents.includes(s.regNo));

        return (
            <div className={styles.sectionContainer}>
                <div className={styles.sectionHeader} style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h2 className={styles.sectionTitle} style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1e293b' }}>Student Management ({filteredStudents.length})</h2>
                        {selectedStudents.length > 0 && (
                            <button
                                className={styles.secondaryBtn}
                                onClick={handleBulkDelete}
                                style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', padding: '0.4rem 0.8rem' }}
                            >
                                <Trash2 size={16} /> Delete Selected ({selectedStudents.length})
                            </button>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <select className={styles.deptSelect} value={studentFilterSem} onChange={(e) => setStudentFilterSem(e.target.value)} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                            <option value="all">All Semesters</option>
                            {[1, 2, 3, 4, 5, 6].map(sem => (
                                <option key={sem} value={sem}>{sem}{sem === 1 ? 'st' : sem === 2 ? 'nd' : sem === 3 ? 'rd' : 'th'} Semester</option>
                            ))}
                        </select>
                        <select className={styles.deptSelect} value={studentFilterSec} onChange={(e) => setStudentFilterSec(e.target.value)} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                            <option value="all">All Sections</option>
                            {allSections.map(sec => (
                                <option key={sec} value={sec}>Section {sec}</option>
                            ))}
                        </select>

                        <button className={styles.primaryBtn} onClick={() => setShowAddStudentModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <UserPlus size={16} /> Add New Student
                        </button>
                        <div>
                            <input
                                type="file"
                                id="csvUpload"
                                accept=".csv"
                                style={{ display: 'none' }}
                                onChange={handleFileUpload}
                            />
                            <button
                                className={styles.secondaryBtn}
                                onClick={() => document.getElementById('csvUpload').click()}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#ecfdf5', color: '#059669', border: '1px solid #d1fae5' }}
                            >
                                <Upload size={16} /> Bulk Upload CSV
                            </button>
                        </div>
                    </div>
                </div>

                <div className={styles.tableContainer} style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th style={{ width: '40px' }}>
                                    <input
                                        type="checkbox"
                                        checked={allVisibleSelected}
                                        onChange={() => toggleSelectAll(filteredStudents)}
                                    />
                                </th>
                                <th style={{ width: '60px' }}>Sl. No</th>

                                <th>Student Name</th>
                                <th>Reg No</th>
                                <th>Sem / Sec</th>

                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.length > 0 ? filteredStudents.map((std, index) => (
                                <tr key={std.id} className={selectedStudents.includes(std.regNo) ? styles.selectedRow : ''} style={selectedStudents.includes(std.regNo) ? { backgroundColor: '#f1f5f9' } : {}}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={selectedStudents.includes(std.regNo)}
                                            onChange={() => toggleSelectStudent(std.regNo)}
                                        />
                                    </td>
                                    <td style={{ color: '#64748b' }}>{index + 1}</td>
                                    <td style={{ fontWeight: 600, color: '#1e293b' }}>{std.regNo}</td>
                                    <td>{std.name}</td>
                                    <td>{std.semester} - {std.section || 'A'}</td>

                                    <td>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button className={styles.secondaryBtn} onClick={() => openResetPasswordModal(std.regNo, std.name, 'STUDENT')} style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a' }} title="Reset Password">
                                                <Key size={14} /> Reset
                                            </button>
                                            <button className={styles.secondaryBtn} onClick={() => handleDeleteStudent(std.regNo)} style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }} title="Delete Student">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No students found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Add Student Modal */}
                {showAddStudentModal && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modalContent} style={{ maxWidth: '500px' }}>
                            <div className={styles.modalHeader}>
                                <h3>Add New Student</h3>
                                <button className={styles.closeBtn} onClick={() => setShowAddStudentModal(false)}><X size={24} /></button>
                            </div>
                            <div className={styles.modalBody}>
                                <form onSubmit={handleAddStudent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                                    <div className={styles.formGroup}>
                                        <label>Full Name</label>
                                        <input value={studentForm.name} onChange={e => setStudentForm({ ...studentForm, name: e.target.value })} required placeholder="e.g. John Doe" className={styles.input} />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Register Number (used for login)</label>
                                        <input value={studentForm.regNo} onChange={e => setStudentForm({ ...studentForm, regNo: e.target.value })} required placeholder="e.g. 4JK22CS001" className={styles.input} />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Email</label>
                                        <input value={studentForm.email} onChange={e => setStudentForm({ ...studentForm, email: e.target.value })} type="email" placeholder="john@college.edu" className={styles.input} />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className={styles.formGroup}>
                                            <label>Semester</label>
                                            <select value={studentForm.semester} onChange={e => setStudentForm({ ...studentForm, semester: e.target.value })} className={styles.input}>
                                                {[1, 2, 3, 4, 5, 6].map(s => <option key={s} value={s}>{s}{s === 1 ? 'st' : s === 2 ? 'nd' : s === 3 ? 'rd' : 'th'} Sem</option>)}
                                            </select>
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label>Section</label>
                                            <input value={studentForm.section} onChange={e => setStudentForm({ ...studentForm, section: e.target.value })} placeholder="A" className={styles.input} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className={styles.formGroup}>
                                            <label>Phone</label>
                                            <input value={studentForm.phone} onChange={e => setStudentForm({ ...studentForm, phone: e.target.value })} placeholder="9876543210" className={styles.input} />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label>Parent Phone</label>
                                            <input value={studentForm.parentPhone} onChange={e => setStudentForm({ ...studentForm, parentPhone: e.target.value })} placeholder="9876543211" className={styles.input} />
                                        </div>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Temporary Password</label>
                                        <input value={studentForm.password} onChange={e => setStudentForm({ ...studentForm, password: e.target.value })} required placeholder="password123" className={styles.input} />
                                        <small style={{ color: '#64748b', fontSize: '0.75rem' }}>Student can change this after first login.</small>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
                                        <button type="button" className={styles.secondaryBtn} onClick={() => setShowAddStudentModal(false)}>Cancel</button>
                                        <button type="submit" className={styles.primaryBtn} style={{ background: '#2563eb', color: 'white' }}>Create Student</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderResetPasswordModal = () => {
        if (!showResetPasswordModal || !resetTarget) return null;
        return (
            <div className={styles.modalOverlay} onClick={() => setShowResetPasswordModal(false)}>
                <div className={styles.modalContent} style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
                    <div className={styles.modalHeader}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Key size={20} /> Reset Password</h3>
                        <button className={styles.closeBtn} onClick={() => setShowResetPasswordModal(false)}><X size={24} /></button>
                    </div>
                    <div className={styles.modalBody}>
                        <p style={{ marginBottom: '1rem', color: '#475569' }}>
                            Resetting password for <strong>{resetTarget.fullName || resetTarget.username}</strong>
                            <span style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px', color: '#64748b' }}>{resetTarget.role}</span>
                        </p>
                        <div className={styles.formGroup}>
                            <label>New Password</label>
                            <input
                                type="text"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                placeholder="Enter new password (min 4 chars)"
                                className={styles.input}
                                autoFocus
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                            <button className={styles.secondaryBtn} onClick={() => setShowResetPasswordModal(false)}>Cancel</button>
                            <button className={styles.primaryBtn} onClick={handleResetPassword} disabled={newPassword.length < 4} style={{ opacity: newPassword.length < 4 ? 0.6 : 1, background: '#d97706', color: 'white' }}>
                                <Key size={14} /> Reset Password
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderAllStudents = () => {
        // Calculate available sections based on Students AND Faculty
        const studentSections = deptStudents.map(s => s.section || 'A');
        const facultySections = facultyList.map(f => f.section).filter(Boolean); // Filter out null/undefined

        // Combine and unique
        const allSections = [...new Set([...studentSections, ...facultySections])].map(s => s.toUpperCase());
        let uniqueSections = allSections.sort();

        // Ensure 'A' is always present if list is empty (default behavior)
        if (uniqueSections.length === 0) uniqueSections = ['A'];

        // Filter Logic
        const filteredStudents = deptStudents.filter(std => {
            const semMatch = studentFilterSem === 'all' || std.semester == studentFilterSem;
            const secMatch = studentFilterSec === 'all' || (std.section && std.section.toUpperCase() === studentFilterSec);
            return semMatch && secMatch;
        });

        return (
            <div className={styles.sectionContainer}>
                <div className={styles.sectionHeader} style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <h2 className={styles.sectionTitle} style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1e293b' }}>All Students ({filteredStudents.length})</h2>

                    <div className={styles.filterGroup} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <select
                            className={styles.deptSelect}
                            value={studentFilterSem}
                            onChange={(e) => setStudentFilterSem(e.target.value)}
                            style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        >
                            <option value="all">All Semesters</option>
                            {[1, 2, 3, 4, 5, 6].map(sem => (
                                <option key={sem} value={sem}>{sem}{sem === 1 ? 'st' : sem === 2 ? 'nd' : sem === 3 ? 'rd' : 'th'} Semester</option>
                            ))}
                        </select>
                        <select
                            className={styles.deptSelect}
                            value={studentFilterSec}
                            onChange={(e) => setStudentFilterSec(e.target.value)}
                            style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        >
                            <option value="all">All Sections</option>
                            {uniqueSections.map(sec => (
                                <option key={sec} value={sec}>Section {sec}</option>
                            ))}
                        </select>
                        <button className={styles.primaryBtn} onClick={() => {
                            if (filteredStudents.length === 0) {
                                alert('No students to export.');
                                return;
                            }
                            const headers = ['Sl.No', 'Reg No', 'Student Name', 'Semester', 'Section', 'Parent Phone'];
                            const rows = filteredStudents.map((std, idx) => [
                                idx + 1,
                                std.regNo || '',
                                `"${(std.name || '').replace(/"/g, '""')}"`,
                                std.semester || '',
                                std.section || 'A',
                                std.parentPhone || ''
                            ].join(','));
                            const csvContent = [headers.join(','), ...rows].join('\n');
                            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            const semLabel = studentFilterSem === 'all' ? 'AllSem' : `Sem${studentFilterSem}`;
                            const secLabel = studentFilterSec === 'all' ? 'AllSec' : `Sec${studentFilterSec}`;
                            link.download = `Students_${selectedDept}_${semLabel}_${secLabel}.csv`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                        }}>
                            <Download size={18} /> Export List
                        </button>
                    </div>
                </div>
                <div className={styles.tableContainer} style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th style={{ width: '60px' }}>Sl. No</th>
                                <th>Student Name</th>
                                <th>Reg No</th>
                                <th>Sem / Sec</th>
                                <th>Parent Phone</th>
                                <th>Action</th>

                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.length > 0 ? filteredStudents.map((std, index) => (
                                <tr key={std.id}>
                                    <td style={{ color: '#64748b' }}>{index + 1}</td>
                                    <td>{std.name}</td>
                                    <td style={{ fontWeight: 600, color: '#1e293b' }}>{std.regNo}</td>



                                    <td>{std.semester} - {std.section || 'A'}</td>
                                    <td>{std.parentPhone || '-'}</td>
                                    <td>
                                        <button
                                            className={styles.secondaryBtn}
                                            onClick={() => fetchStudentProfile(std)}
                                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                        >
                                            <Users size={14} /> View Profile
                                        </button>
                                    </td>

                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                                        No students found for the selected filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderStudentProfileModal = () => {
        if (!showProfileModal || !selectedStudentProfile) return null;

        return (
            <div className={styles.modalOverlay}>
                <div className={styles.modalContent} style={{ maxWidth: '800px', width: '90%' }}>
                    <div className={styles.modalHeader}>
                        <div>
                            <h3 className={styles.modalTitle}>{selectedStudentProfile.name}</h3>
                            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                                {selectedStudentProfile.regNo} | {selectedStudentProfile.semester} Sem | Section {selectedStudentProfile.section || 'A'}
                            </p>
                            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                                Parent Contact: <strong>{selectedStudentProfile.parentPhone || 'Not Available'}</strong>
                            </p>
                        </div>
                        <button className={styles.closeBtn} onClick={() => setShowProfileModal(false)}>
                            <X size={24} />
                        </button>
                    </div>
                    <div className={styles.modalBody}>
                        <h4 style={{ marginBottom: '1rem', color: '#334155' }}>CIE Marks Overview</h4>
                        {studentMarksProfile.length > 0 ? (
                            <table className={styles.table} style={{ border: '1px solid #e2e8f0' }}>
                                <thead style={{ background: '#f8fafc' }}>
                                    <tr>
                                        <th>Subject</th>
                                        <th>CIE Type</th>
                                        <th>Marks Obtained</th>
                                        <th>Max Marks</th>

                                    </tr>
                                </thead>
                                <tbody>
                                    {studentMarksProfile.map((mark, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                <div style={{ fontWeight: 500 }}>{mark.subjectName}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{mark.subjectCode}</div>
                                            </td>
                                            <td><span className={styles.statusBadge} style={{ background: '#e0f2fe', color: '#0369a1' }}>{mark.cieType}</span></td>
                                            <td style={{ fontWeight: 600 }}>{mark.marks}</td>
                                            <td style={{ color: '#64748b' }}>{mark.maxMarks}</td>

                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', background: '#f8fafc', borderRadius: '8px' }}>
                                No marks found for this student.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };


    // Extracted tab-rendering content into a reusable function
    const renderContent = () => (
        <>
            {activeTab === 'announcements' && (<div className={styles.announcementContainer}><div className={styles.card}><div className={styles.cardHeader}><h3>Department IA Schedule</h3><div style={{ display: 'flex', gap: '10px' }}><button className={styles.secondaryBtn}><Calendar size={16} /> Sync to Calendar</button><button className={styles.quickBtn} style={{ background: '#fef3c7', color: '#d97706' }}><ShieldAlert size={16} /> Check Conflicts</button></div></div><div className={styles.tableWrapper}><table className={styles.table}><thead><tr><th>Subject</th><th>CIE Round</th><th>Faculty</th><th>Scheduled Date</th><th>Status</th><th>Actions</th></tr></thead><tbody>{departmentAnnouncements.length > 0 ? departmentAnnouncements.map((ann, idx) => (<tr key={idx}><td style={{ fontWeight: 600 }}>{ann.subject?.name}</td><td><span className={styles.tag}>CIE-{ann.cieNumber}</span></td><td>{ann.faculty?.username}</td><td>{ann.scheduledDate}</td><td><span className={`${styles.statusBadge} ${styles.approved}`}>{ann.status || 'SCHEDULED'}</span></td><td>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className={styles.iconBtn} onClick={() => handleEditSchedule(ann)} title="Edit" style={{ color: '#2563eb', background: '#dbeafe' }}><Edit size={16} /></button>
                    <button className={styles.iconBtn} onClick={() => handleDeleteSchedule(ann.id)} title="Delete" style={{ color: '#dc2626', background: '#fee2e2' }}><Trash2 size={16} /></button>
                </div>
            </td></tr>)) : (<tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No announcements found.</td></tr>)}</tbody></table></div></div></div>)}
            {activeTab === 'notifications' && (
                <div className={styles.notificationsContainer} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>Send Message</h2>
                        <div className={styles.messageForm} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className={styles.formGroup}>
                                <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>Recipient Group</label>
                                <select
                                    className={styles.deptSelect}
                                    value={messageRecipientType}
                                    onChange={(e) => setMessageRecipientType(e.target.value)}
                                    style={{ width: '100%', padding: '0.75rem' }}
                                >
                                    <option value="FACULTY">All Faculty</option>
                                    <option value="STUDENT">All Students</option>
                                    <option value="BOTH">Students and Faculty</option>
                                    <option value="PRINCIPAL">Principal</option>
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>Message</label>
                                <textarea
                                    className={styles.input}
                                    rows="5"
                                    placeholder="Type your message here..."
                                    value={newMessageText || ''}
                                    onChange={(e) => {
                                        console.log('Typing:', e.target.value);
                                        setNewMessageText(e.target.value);
                                    }}
                                    disabled={false}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid #e5e7eb',
                                        color: '#333333',
                                        position: 'relative',
                                        zIndex: 10
                                    }}
                                />
                            </div>
                            <button className={styles.primaryBtn} onClick={handleSendNewMessage} style={{ alignSelf: 'flex-start' }}>
                                <Mail size={16} /> Send Message
                            </button>
                        </div>
                    </div>
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
                                    <div className={styles.notifIcon}>{notif.type === 'INFO' ? <Bell size={20} /> : <AlertTriangle size={20} />}</div>
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
                                <div className={styles.emptyState}><Bell size={48} /><p>No notifications yet</p></div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {activeTab === 'all-students' && renderAllStudents()}
            {activeTab === 'student-mgmt' && renderStudentManagement()}
            {activeTab === 'overview' && (<div className={styles.overviewContainer}><div className={styles.statsRow}><div className={styles.statCard} onClick={() => setActiveTab('all-students')} style={{ cursor: 'pointer' }}><div className={`${styles.iconBox} ${styles.blue}`}><Users size={24} /></div><div className={styles.statInfo}><p>Total Students</p><h3>{deptStudents.length || 0}</h3></div></div><div className={styles.statCard} onClick={() => setActiveTab('faculty')} style={{ cursor: 'pointer' }}><div className={`${styles.iconBox} ${styles.green}`}><Briefcase size={24} /></div><div className={styles.statInfo}><p>Faculty Members</p><h3>{facultyList.length || 0}</h3></div></div><div className={styles.statCard} onClick={() => setActiveTab('performance')} style={{ cursor: 'pointer' }}><div className={`${styles.iconBox} ${styles.purple}`}><FileText size={24} /></div><div className={styles.statInfo}><p>Dept. Average</p><h3>{analytics ? analytics.average : '-'}/50</h3></div></div><div className={styles.statCard} onClick={() => setActiveTab('performance')} style={{ cursor: 'pointer' }}><div className={`${styles.iconBox} ${styles.orange}`}><Activity size={24} /></div><div className={styles.statInfo}><p>Pass Percentage</p><h3>{analytics ? analytics.passPercentage : '-'}%</h3></div></div></div><div className={styles.gridTwoOne}><div className={styles.leftColumn}><div className={styles.card} style={{ marginBottom: '1.5rem' }}><div className={styles.cardHeader}><h3>Department Performance (Avg IA Score)</h3></div><div className={styles.circlesContainer}><div className={styles.circlesContainer}>{analytics ? [{ label: 'Avg Percentage', value: Math.round(((analytics.average || 0) / 50) * 100) }, { label: 'Pass Rate', value: analytics.passPercentage || 0 }, { label: 'Risk Factor', value: (analytics.totalStudents || deptStudents.length) > 0 ? Math.round(((analytics.atRiskCount || 0) / (analytics.totalStudents || deptStudents.length)) * 100) : 0 }].map((metric, index) => { const data = { labels: ['Metric', 'Remaining'], datasets: [{ data: [metric.value, 100 - metric.value], backgroundColor: ['#8b5cf6', '#f3f4f6'], borderWidth: 0, cutout: '70%' }] }; return (<div key={index} className={styles.circleItem}><div style={{ height: '120px', width: '120px', position: 'relative' }}><Doughnut data={data} options={{ ...doughnutOptions, plugins: { legend: { display: false }, tooltip: { enabled: false } } }} /><div className={styles.circleLabel}><span className={styles.circleValue}>{metric.value}%</span></div></div><p className={styles.circleName}>{metric.label}</p></div>); }) : <p style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Loading Analytics...</p>}</div></div></div></div><div className={styles.rightColumn}><div className={styles.card}><div className={styles.cardHeader}><h3>Recent Alerts</h3>{departmentAlerts.length > 3 && (<button className={styles.secondaryBtn} style={{ fontSize: '0.8rem', padding: '4px 8px' }} onClick={() => setShowAllAlerts(!showAllAlerts)}>{showAllAlerts ? 'Show Less' : 'View All'}</button>)}</div><div className={styles.alertList}>{(showAllAlerts ? departmentAlerts : departmentAlerts.slice(0, 3)).map(alert => (<div key={alert.id} className={`${styles.alertItem} ${styles[alert.type]}`}><AlertTriangle size={16} /><div><p>{alert.message}</p><span>{alert.date}</span></div></div>))}</div></div></div></div></div>)}
            {activeTab === 'update-marks' && (<div className={styles.updateMarksContainer}><div className={styles.card}><div className={styles.cardHeader}><h3>Modify Student Marks</h3><div className={styles.filterGroup}>
                <select className={styles.deptSelect} value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)} style={{ marginRight: '10px' }}>
                    <option value="all">All Semesters</option>
                    {[1, 2, 3, 4, 5, 6].map(sem => (
                        <option key={sem} value={sem}>{sem}{sem === 1 ? 'st' : sem === 2 ? 'nd' : sem === 3 ? 'rd' : 'th'} Semester</option>
                    ))}
                </select>
                <select className={styles.deptSelect} value={selectedCieType} onChange={(e) => setSelectedCieType(e.target.value)} style={{ marginRight: '10px' }}>
                    <option value="all">All CIEs & Attendance</option>
                    <option value="cie1">CIE-1</option>
                    <option value="cie2">CIE-2</option>
                    <option value="cie3">CIE-3</option>
                    <option value="cie4">CIE-4</option>
                    <option value="cie5">CIE-5</option>
                </select>
                <select className={styles.deptSelect} value={selectedSubject?.id || ''} onChange={(e) => { const sub = subjects.find(s => s.id === parseInt(e.target.value)); setSelectedSubject(sub); }}>
                    {subjects.filter(sub => {
                        // Filter out IC
                        if (sub.name === 'IC') return false;

                        // Check if subject is assigned to any faculty
                        const isAssigned = facultyList.some(fac => parseSubjects(fac.subjects).includes(sub.name));
                        // Also include if it's currently selected (to avoid it disappearing)
                        return isAssigned || (selectedSubject && selectedSubject.id === sub.id);
                    }).map(sub => (<option key={sub.id} value={sub.id}>{sub.name}</option>))}
                </select><button className={styles.saveBtn} onClick={saveMarks}><Save size={16} /> Save Changes</button></div></div><p className={styles.helperText}>Edit marks directly in the table. Changes are tracked locally until saved. Max Marks: CIE-1 to CIE-5 (50 each) - Total (250)</p><div className={styles.tableWrapper}><table className={styles.table} style={selectedCieType === 'all' ? { minWidth: '1800px' } : {}}><thead><tr><th>Sl. No.</th><th style={{ width: '150px', minWidth: '150px' }}>Reg No</th><th style={{ width: '350px', minWidth: '350px' }}>Student Name</th>
                    {['cie1', 'all'].includes(selectedCieType) && <th style={['cie1', 'all'].includes(selectedCieType) ? { background: '#eff6ff', color: '#1d4ed8' } : {}}>CIE-1 (50)</th>}
                    {['cie1', 'all'].includes(selectedCieType) && <th style={{ background: '#f0fdf4', color: '#15803d' }}>Att (%)</th>}
                    {['cie2', 'all'].includes(selectedCieType) && <th style={['cie2', 'all'].includes(selectedCieType) ? { background: '#eff6ff', color: '#1d4ed8' } : {}}>CIE-2 (50)</th>}
                    {['cie2', 'all'].includes(selectedCieType) && <th style={{ background: '#f0fdf4', color: '#15803d' }}>Att (%)</th>}
                    {['cie3', 'all'].includes(selectedCieType) && <th style={['cie3', 'all'].includes(selectedCieType) ? { background: '#eff6ff', color: '#1d4ed8' } : {}}>CIE-3 (50)</th>}
                    {['cie3', 'all'].includes(selectedCieType) && <th style={{ background: '#f0fdf4', color: '#15803d' }}>Att (%)</th>}
                    {['cie4', 'all'].includes(selectedCieType) && <th style={['cie4', 'all'].includes(selectedCieType) ? { background: '#eff6ff', color: '#1d4ed8' } : {}}>CIE-4 (50)</th>}
                    {['cie4', 'all'].includes(selectedCieType) && <th style={{ background: '#f0fdf4', color: '#15803d' }}>Att (%)</th>}
                    {['cie5', 'all'].includes(selectedCieType) && <th style={['cie5', 'all'].includes(selectedCieType) ? { background: '#eff6ff', color: '#1d4ed8' } : {}}>CIE-5 (50)</th>}
                    {['cie5', 'all'].includes(selectedCieType) && <th style={{ background: '#f0fdf4', color: '#15803d' }}>Att (%)</th>}
                    <th>Total (250)</th><th style={{ background: '#fefce8', color: '#a16207', width: '250px', minWidth: '250px' }}>Remarks</th></tr></thead><tbody>{students.filter(s => selectedSemester === 'all' || s.semester == selectedSemester).map((student, index) => {
                        const editMark = editingMarks[student.id] || {};
                        const valCIE1 = (editMark.cie1 !== undefined && editMark.cie1 !== null) ? editMark.cie1 : '';
                        const valCIE2 = (editMark.cie2 !== undefined && editMark.cie2 !== null) ? editMark.cie2 : '';
                        const valCIE3 = (editMark.cie3 !== undefined && editMark.cie3 !== null) ? editMark.cie3 : '';
                        const valCIE4 = (editMark.cie4 !== undefined && editMark.cie4 !== null) ? editMark.cie4 : '';
                        const valCIE5 = (editMark.cie5 !== undefined && editMark.cie5 !== null) ? editMark.cie5 : '';
                        const att1Val = (editMark.cie1Att !== undefined && editMark.cie1Att !== null) ? editMark.cie1Att : '';
                        const att2Val = (editMark.cie2Att !== undefined && editMark.cie2Att !== null) ? editMark.cie2Att : '';
                        const att3Val = (editMark.cie3Att !== undefined && editMark.cie3Att !== null) ? editMark.cie3Att : '';
                        const att4Val = (editMark.cie4Att !== undefined && editMark.cie4Att !== null) ? editMark.cie4Att : '';
                        const att5Val = (editMark.cie5Att !== undefined && editMark.cie5Att !== null) ? editMark.cie5Att : '';
                        const total = (Number(valCIE1) || 0) + (Number(valCIE2) || 0) + (Number(valCIE3) || 0) + (Number(valCIE4) || 0) + (Number(valCIE5) || 0);
                        const cieVals = [
                            { key: 'CIE-1', val: valCIE1, att: att1Val !== '' ? parseFloat(att1Val) : null },
                            { key: 'CIE-2', val: valCIE2, att: att2Val !== '' ? parseFloat(att2Val) : null },
                            { key: 'CIE-3', val: valCIE3, att: att3Val !== '' ? parseFloat(att3Val) : null },
                            { key: 'CIE-4', val: valCIE4, att: att4Val !== '' ? parseFloat(att4Val) : null },
                            { key: 'CIE-5', val: valCIE5, att: att5Val !== '' ? parseFloat(att5Val) : null }
                        ];
                        const parts = []; let worstColor = '#94a3b8'; let worstBg = 'transparent';
                        cieVals.forEach(c => {
                            const v = c.val !== '' && c.val !== null && c.val !== undefined ? parseFloat(c.val) : null;
                            const att = c.att;
                            if (v == null) return;
                            if (v < 25 && att != null && att < 75) {
                                parts.push(`${c.key}: Low Marks, Low Att`); worstColor = '#dc2626'; worstBg = '#fef2f2';
                            } else if (v < 25) {
                                parts.push(`${c.key}: Low Marks`);
                                if (worstColor !== '#dc2626') { worstColor = '#ea580c'; worstBg = '#fff7ed'; }
                            } else if (att != null && att < 75) {
                                if (!parts.some(p => p.includes('Low Att'))) { parts.push('Low Att'); }
                                if (worstColor !== '#dc2626') { worstColor = '#ea580c'; worstBg = '#fff7ed'; }
                            }
                        });
                        const filledCount = cieVals.filter(c => c.val !== '' && c.val !== null && c.val !== undefined).length;
                        let remark = '-'; let remarkColor = '#94a3b8'; let remarkBg = 'transparent';
                        if (parts.length > 0) {
                            remark = parts.join(' | '); remarkColor = worstColor; remarkBg = worstBg;
                        } else if (filledCount > 0) {
                            const avg = total / filledCount;
                            const allAttGood = cieVals.filter(c => c.att != null).every(c => c.att >= 75);
                            if (avg >= 40 && allAttGood) { remark = 'Excellent'; remarkColor = '#15803d'; remarkBg = '#f0fdf4'; }
                            else { remark = 'Good'; remarkColor = '#2563eb'; remarkBg = '#eff6ff'; }
                        }
                        return (<tr key={student.id}><td>{index + 1}</td><td style={{ width: '150px', minWidth: '150px', fontWeight: 600 }}>{student.regNo}</td><td style={{ width: '350px', minWidth: '350px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '350px', fontWeight: 500 }} title={student.name}>{student.name}</td>
                            {['cie1', 'all'].includes(selectedCieType) && <td style={['cie1', 'all'].includes(selectedCieType) && selectedCieType !== 'all' ? { background: '#f8fafc' } : {}}><input type="number" className={styles.markInput} value={valCIE1} max={50} onChange={(e) => handleMarkChange(student.id, 'cie1', e.target.value)} /></td>}
                            {['cie1', 'all'].includes(selectedCieType) && <td style={{ background: '#f0fdf4' }}><input type="number" className={styles.markInput} style={{ border: '1px solid #86efac', color: '#15803d', background: '#f0fdf4' }} value={att1Val} max={100} onChange={(e) => handleMarkChange(student.id, 'cie1Att', e.target.value)} /></td>}
                            {['cie2', 'all'].includes(selectedCieType) && <td style={['cie2', 'all'].includes(selectedCieType) && selectedCieType !== 'all' ? { background: '#f8fafc' } : {}}><input type="number" className={styles.markInput} value={valCIE2} max={50} onChange={(e) => handleMarkChange(student.id, 'cie2', e.target.value)} /></td>}
                            {['cie2', 'all'].includes(selectedCieType) && <td style={{ background: '#f0fdf4' }}><input type="number" className={styles.markInput} style={{ border: '1px solid #86efac', color: '#15803d', background: '#f0fdf4' }} value={att2Val} max={100} onChange={(e) => handleMarkChange(student.id, 'cie2Att', e.target.value)} /></td>}
                            {['cie3', 'all'].includes(selectedCieType) && <td style={['cie3', 'all'].includes(selectedCieType) && selectedCieType !== 'all' ? { background: '#f8fafc' } : {}}><input type="number" className={styles.markInput} value={valCIE3} max={50} onChange={(e) => handleMarkChange(student.id, 'cie3', e.target.value)} /></td>}
                            {['cie3', 'all'].includes(selectedCieType) && <td style={{ background: '#f0fdf4' }}><input type="number" className={styles.markInput} style={{ border: '1px solid #86efac', color: '#15803d', background: '#f0fdf4' }} value={att3Val} max={100} onChange={(e) => handleMarkChange(student.id, 'cie3Att', e.target.value)} /></td>}
                            {['cie4', 'all'].includes(selectedCieType) && <td style={['cie4', 'all'].includes(selectedCieType) && selectedCieType !== 'all' ? { background: '#f8fafc' } : {}}><input type="number" className={styles.markInput} value={valCIE4} max={50} onChange={(e) => handleMarkChange(student.id, 'cie4', e.target.value)} /></td>}
                            {['cie4', 'all'].includes(selectedCieType) && <td style={{ background: '#f0fdf4' }}><input type="number" className={styles.markInput} style={{ border: '1px solid #86efac', color: '#15803d', background: '#f0fdf4' }} value={att4Val} max={100} onChange={(e) => handleMarkChange(student.id, 'cie4Att', e.target.value)} /></td>}
                            {['cie5', 'all'].includes(selectedCieType) && <td style={['cie5', 'all'].includes(selectedCieType) && selectedCieType !== 'all' ? { background: '#f8fafc' } : {}}><input type="number" className={styles.markInput} value={valCIE5} max={50} onChange={(e) => handleMarkChange(student.id, 'cie5', e.target.value)} /></td>}
                            {['cie5', 'all'].includes(selectedCieType) && <td style={{ background: '#f0fdf4' }}><input type="number" className={styles.markInput} style={{ border: '1px solid #86efac', color: '#15803d', background: '#f0fdf4' }} value={att5Val} max={100} onChange={(e) => handleMarkChange(student.id, 'cie5Att', e.target.value)} /></td>}

                            <td style={{ fontWeight: 'bold' }}>{Math.min(total, 250)}</td>

                            {(() => {
                                const getCieRemark = (v, a, label) => {
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
                                    getCieRemark(valCIE1 !== '' ? parseFloat(valCIE1) : null, att1Val !== '' ? parseFloat(att1Val) : null, 'CIE-1'),
                                    getCieRemark(valCIE2 !== '' ? parseFloat(valCIE2) : null, att2Val !== '' ? parseFloat(att2Val) : null, 'CIE-2'),
                                    getCieRemark(valCIE3 !== '' ? parseFloat(valCIE3) : null, att3Val !== '' ? parseFloat(att3Val) : null, 'CIE-3'),
                                    getCieRemark(valCIE4 !== '' ? parseFloat(valCIE4) : null, att4Val !== '' ? parseFloat(att4Val) : null, 'CIE-4'),
                                    getCieRemark(valCIE5 !== '' ? parseFloat(valCIE5) : null, att5Val !== '' ? parseFloat(att5Val) : null, 'CIE-5')
                                ];
                                const filled = allCies.filter(r => r !== null);

                                if (selectedCieType === 'all' && filled.length > 0) {
                                    const worst = Math.max(...filled.map(r => r.severity));
                                    const color = worst >= 3 ? '#dc2626' : worst >= 2 ? '#ea580c' : '#15803d';
                                    const bg = worst >= 3 ? '#fef2f2' : worst >= 2 ? '#fff7ed' : '#f0fdf4';

                                    const lowMarksCies = filled.filter(r => r.lowMarks).map(r => r.label);
                                    const lowAttCies = filled.filter(r => r.lowAtt).map(r => r.label);

                                    let textParts = [];
                                    if (lowMarksCies.length > 0) textParts.push(`${lowMarksCies.join(',')} Low Marks`);
                                    if (lowAttCies.length > 0) textParts.push(`${lowAttCies.join(',')} Low Att`);
                                    if (textParts.length === 0) {
                                        const allExcellent = filled.every(r => r.excellent);
                                        textParts.push(allExcellent ? 'All Excellent' : 'All Good');
                                    }
                                    const text = textParts.join(' | ');
                                    return <td style={{ width: '250px', minWidth: '250px', padding: '8px 4px', background: bg }}>
                                        <div style={{ fontSize: '0.65rem', fontWeight: 600, color, whiteSpace: 'normal', wordWrap: 'break-word', lineHeight: '1.4' }}>{text}</div>
                                    </td>;
                                } else if (selectedCieType === 'all') {
                                    return <td style={{ width: '250px', minWidth: '250px', padding: 0 }}><div style={{ fontSize: '0.72rem', color: '#94a3b8', padding: '8px 4px' }}>-</div></td>;
                                }

                                /* Specific CIE selected */
                                const indexMap = { 'cie1': 0, 'cie2': 1, 'cie3': 2, 'cie4': 3, 'cie5': 4 };
                                const focused = allCies[indexMap[selectedCieType]];

                                if (!focused) return <td style={{ width: '250px', minWidth: '250px', padding: 0 }}><div style={{ fontSize: '0.72rem', color: '#94a3b8', padding: '8px 4px' }}>-</div></td>;
                                const color = focused.severity >= 3 ? '#dc2626' : focused.severity >= 2 ? '#ea580c' : focused.severity === 0 ? '#15803d' : '#2563eb';
                                const bg = focused.severity >= 3 ? '#fef2f2' : focused.severity >= 2 ? '#fff7ed' : '#f0fdf4';
                                return <td style={{ width: '250px', minWidth: '250px', padding: '8px 4px', background: bg }}>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color, whiteSpace: 'normal', wordWrap: 'break-word', lineHeight: '1.4' }}>{focused.text}</div>
                                </td>;

                            })()}
                        </tr>);
                    })}</tbody></table></div></div></div>)}
            {activeTab === 'monitoring' && (
                <div className={styles.monitoringContainer}>
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h3>Subject-wise IA Submission Status</h3>
                            <div className={styles.filterGroup}>
                                <select className={styles.deptSelect} style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}>
                                    <option>All Semesters</option>
                                    <option>2nd Semester</option>
                                    <option>4th Semester</option>
                                </select>
                            </div>
                        </div>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Subject Name</th>
                                    <th>Status</th>
                                    <th>Pending Count</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {subjects.filter(sub => sub.name !== 'IC').map((subject, idx) => {
                                    const subjectMarks = subjectMarksData[subject.name] || [];
                                    const totalStudents = deptStudents.length;
                                    const studentsWithMarks = subjectMarks.filter(mark => mark.cie1Score !== null || mark.cie2Score !== null || mark.cie3Score !== null).length;
                                    const pendingCount = totalStudents - studentsWithMarks;
                                    let status = 'Pending';
                                    if (pendingCount === 0) {
                                        status = 'Approved';
                                    } else if (studentsWithMarks > 0) {
                                        status = 'Submitted';
                                    }
                                    return (
                                        <tr key={subject.id} style={{ transition: 'background 0.2s' }}>
                                            <td style={{ fontWeight: 500 }}>{subject.name}</td>
                                            <td>
                                                <span className={`${styles.statusBadge} ${status === 'Approved' ? styles.approved : status === 'Submitted' ? styles.submitted : styles.pending}`}>
                                                    {status}
                                                </span>
                                            </td>
                                            <td>
                                                {pendingCount > 0 ? (
                                                    <span style={{ color: '#ef4444', fontWeight: 500 }}>{pendingCount} Students</span>
                                                ) : (
                                                    <span style={{ color: '#94a3b8' }}>-</span>
                                                )}
                                            </td>
                                            <td>
                                                <button
                                                    className={styles.secondaryBtn}
                                                    style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                                                    onClick={() => setViewingSubject({
                                                        name: subject.name,
                                                        subjectId: subject.id,
                                                        status: status,
                                                        pendingCount: pendingCount
                                                    })}
                                                >
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {viewingSubject && (
                        <div className={styles.modalOverlay} onClick={() => setViewingSubject(null)}>
                            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                                <div className={styles.modalHeader}>
                                    <h2>{viewingSubject.name}</h2>
                                    <button className={styles.closeBtn} onClick={() => setViewingSubject(null)}><X size={24} /></button>
                                </div>
                                <div className={styles.modalBody}>
                                    <p style={{ marginBottom: '1.5rem', color: '#6b7280' }}>
                                        Status: <span className={`${styles.statusBadge} ${viewingSubject.status === 'Approved' ? styles.approved : viewingSubject.status === 'Submitted' ? styles.submitted : styles.pending}`} style={{ marginLeft: '10px' }}>{viewingSubject.status}</span>
                                    </p><div className={styles.tableWrapper}><table className={styles.table}><thead><tr><th>Sl. No.</th><th>Reg No</th><th>Student Name</th><th>CIE-1</th><th>Att %</th><th>CIE-2</th><th>CIE-3</th><th>CIE-4</th><th>CIE-5</th><th>Total</th></tr></thead><tbody>{(() => { const subjectMarks = subjectMarksData[viewingSubject.name] || []; const studentsToShow = viewingSubject.status === 'Pending' ? deptStudents.filter(student => { const studentMark = subjectMarks.find(m => m.student?.regNo === student.regNo); return !studentMark || (studentMark.cie1Score === null && studentMark.cie2Score === null && studentMark.cie3Score === null); }) : deptStudents; return studentsToShow.map((student, index) => { const studentMark = subjectMarks.find(m => m.student?.regNo === student.regNo); const cie1 = studentMark?.cie1Score ?? '-'; const cie2 = studentMark?.cie2Score ?? '-'; const cie3 = studentMark?.cie3Score ?? '-'; const cie4 = studentMark?.cie4Score ?? '-'; const cie5 = studentMark?.cie5Score ?? '-'; const att = studentMark?.attendancePercentage ?? '-'; const total = (studentMark?.cie1Score || 0) + (studentMark?.cie2Score || 0) + (studentMark?.cie3Score || 0) + (studentMark?.cie4Score || 0) + (studentMark?.cie5Score || 0); return (<tr key={student.id}><td>{index + 1}</td><td>{student.regNo}</td><td>{student.name}</td><td>{cie1}</td><td>{att !== '-' ? `${att}%` : '-'}</td><td>{cie2}</td><td>{cie3}</td><td>{cie4}</td><td>{cie5}</td><td style={{ fontWeight: 'bold' }}>{studentMark ? total : '-'}</td></tr>); }); })()}</tbody></table></div></div></div></div>)}</div>)}
            {activeTab === 'performance' && (<div className={styles.performanceContainer}><div className={styles.statsRow}><div className={styles.statCard}><div className={`${styles.iconBox} ${styles.blue}`}><Users size={24} /></div><div className={styles.statInfo}><p>Total Students</p><h3>{deptStudents.length || 0}</h3></div></div><div className={styles.statCard}><div className={`${styles.iconBox} ${styles.green}`}><TrendingUp size={24} /></div><div className={styles.statInfo}><p>Class Average</p><h3>{analytics?.average || 0}/50</h3></div></div><div className={styles.statCard}><div className={`${styles.iconBox} ${styles.purple}`}><Award size={24} /></div><div className={styles.statInfo}><p>Pass Rate</p><h3>{analytics?.passPercentage || 0}%</h3></div></div><div className={styles.statCard}><div className={`${styles.iconBox} ${styles.orange}`}><AlertTriangle size={24} /></div><div className={styles.statInfo}><p>At Risk</p><h3>{analytics?.atRiskCount || 0}</h3></div></div></div><div className={styles.gridTwo}><div className={styles.card}><div className={styles.cardHeader}><h3>CIE Performance Trend</h3><select className={styles.deptSelect} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} value={performanceSubjectId} onChange={(e) => setPerformanceSubjectId(e.target.value)}><option value="all">All Subjects</option>{subjects.filter(s => s.name !== 'IC').map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}</select></div><div className={styles.chartContainer}><Bar data={{ labels: ['CIE-1', 'CIE-2', 'CIE-3', 'CIE-4', 'CIE-5'], datasets: [{ label: 'Class Average', data: cieTrendData, backgroundColor: ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'], borderRadius: 8 }] }} options={{ ...commonOptions, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 50 } } }} /></div></div><div className={styles.card}><div className={styles.cardHeader}><h3>Grade Distribution</h3></div><div className={styles.doughnutContainer}><Doughnut data={hodGradeDistribution} options={doughnutOptions} /></div></div></div><div className={styles.card} style={{ marginTop: '1.5rem' }}><div className={styles.cardHeader}><h3>Subject-wise Performance</h3></div><table className={styles.table}><thead><tr><th>Subject</th><th>CIE-1 Avg</th><th>CIE-2 Avg</th><th>CIE-3 Avg</th><th>CIE-4 Avg</th><th>CIE-5 Avg</th><th>Overall</th><th>Pass %</th></tr></thead><tbody>{allSubjectPerformance.map((item) => (<tr key={item.id}><td style={{ fontWeight: 600 }}>{item.name}</td>{['CIE1', 'CIE2', 'CIE3', 'CIE4', 'CIE5'].map((cieType) => { const avg = item.averages[cieType] || 0; return (<td key={cieType}><span style={{ color: avg >= 40 ? '#16a34a' : avg >= 30 ? '#ca8a04' : '#dc2626', fontWeight: 500 }}>{avg}/50</span></td>); })}<td style={{ fontWeight: 700 }}>{item.overall}/50</td><td><span className={`${styles.statusBadge} ${item.passRate >= 80 ? styles.approved : item.passRate >= 60 ? styles.submitted : styles.pending}`}>{item.passRate}%</span></td></tr>))}</tbody></table></div><div className={styles.card} style={{ marginTop: '1.5rem' }}><div className={styles.cardHeader}><h3 style={{ color: '#dc2626' }}>⚠️ At-Risk Students (Action Required)</h3><button className={styles.secondaryBtn} style={{ fontSize: '0.85rem' }}><Download size={14} /> Export List</button></div><table className={styles.table}><thead><tr><th>Reg No</th><th>Student Name</th><th>CIE Average</th><th>Issue</th><th>Action</th></tr></thead><tbody>{atRiskStudents.map((student) => (<tr key={student.id}><td>{student.rollNo}</td><td style={{ fontWeight: 500 }}>{student.name}</td><td><span style={{ color: student.avgMarks < 20 ? '#dc2626' : '#ca8a04', fontWeight: 600 }}>{student.avgMarks}/50</span></td><td><span className={styles.issueTag}>{student.issue}</span></td><td><div style={{ display: 'flex', gap: '0.5rem' }}><button className={styles.secondaryBtn} style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => alert(`Sending notification to ${student.name}`)}>Notify</button><button className={styles.secondaryBtn} style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }} onClick={() => alert(`Scheduling meeting with ${student.name}`)}>Meet</button></div></td></tr>))}</tbody></table></div></div>)}
            {activeTab === 'faculty' && (<div className={styles.facultyContainer}><div className={styles.card}><div className={styles.cardHeader}><h3>Department Faculty ({facultyList.length})</h3><div style={{ display: 'flex', gap: '1rem', position: 'relative' }}><button className={styles.primaryBtn} onClick={() => { setEditingFaculty(null); setFacultyForm({ fullName: '', username: '', email: '', password: 'password123', designation: 'Assistant Professor', subjects: '' }); setShowAddFacultyModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={16} /> Add New Faculty</button><div style={{ position: 'relative' }}><button className={styles.secondaryBtn} onClick={() => setShowEditSelection(!showEditSelection)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', border: '1px solid #e2e8f0' }}><Edit size={16} /> Edit Faculty</button>{showEditSelection && (<div style={{ position: 'absolute', top: '110%', right: 0, width: '250px', background: 'white', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', zIndex: 100, padding: '0.5rem' }}><p style={{ padding: '0.5rem', fontSize: '0.85rem', color: '#64748b', borderBottom: '1px solid #f1f5f9', marginBottom: '0.5rem' }}>Select Faculty to Edit:</p><div style={{ maxHeight: '300px', overflowY: 'auto' }}>{facultyList.map(fac => (<button key={fac.id} onClick={() => { handleEditFaculty(fac); setShowEditSelection(false); }} style={{ width: '100%', textAlign: 'left', padding: '0.75rem', borderRadius: '6px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '2px', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'none'}><span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>{fac.fullName || fac.username}</span><small style={{ color: '#64748b' }}>{fac.designation || 'Faculty'}</small></button>))}</div></div>)}</div></div></div><div className={styles.facultyList} style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '1.5rem' }}>{facultyList.length > 0 ? facultyList.map(fac => (<div key={fac.id} className={styles.facultyItem} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', background: 'white', display: 'flex', flexDirection: 'column' }}><div className={styles.facProfile} style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}><div className={styles.avatarSm} style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>{fac.fullName ? fac.fullName.charAt(0) : fac.username.charAt(0)}</div><div style={{ flex: 1 }}><p className={styles.facName} style={{ fontWeight: 600, fontSize: '1.1rem', color: '#1e293b', margin: 0 }}>{fac.fullName || fac.username}</p><small className={styles.facStatus} style={{ color: '#64748b' }}>{fac.designation || 'Faculty Member'}</small>{(fac.semester || fac.section) && (<small style={{ color: '#2563eb', fontWeight: 500, fontSize: '0.8rem', marginTop: '2px', display: 'block' }}>Class Teacher: {fac.semester ? `${fac.semester} Sem` : ''} {fac.section ? `- Sec ${fac.section}` : ''}</small>)}</div></div><div style={{ marginBottom: '1rem', flex: 1 }}><span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Subjects ({parseSubjects(fac.subjects).length})</span><div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>{parseSubjects(fac.subjects).length > 0 ? parseSubjects(fac.subjects).map((sub, i) => (<span key={i} style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', color: '#475569' }}>{sub}</span>)) : (<span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>No active subjects assigned</span>)}</div></div><div className={styles.facActions} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}><button className={styles.viewBtn} style={{ gridColumn: 'span 2' }} onClick={() => handleViewDashboard(fac)}><LayoutDashboard size={16} /> View Dashboard</button><button className={styles.msgBtn} onClick={() => handleMessage(fac)}><Mail size={16} /> Message</button><button className={styles.secondaryBtn} onClick={() => handleEditFaculty(fac)} style={{ border: '1px solid #e2e8f0', background: 'white', color: '#475569' }}><Edit size={16} /> Edit</button><button className={styles.secondaryBtn} onClick={() => openResetPasswordModal(fac.username, fac.fullName || fac.username, 'FACULTY')} style={{ border: '1px solid #fde68a', background: '#fef3c7', color: '#d97706' }}><Key size={14} /> Reset</button><button className={styles.secondaryBtn} onClick={() => handleDeleteFaculty(fac.id)} style={{ border: '1px solid #fee2e2', background: '#fef2f2', color: '#dc2626' }}><Trash2 size={16} /> Remove</button></div></div>)) : (<div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: '#64748b' }}><Users size={48} style={{ marginBottom: '1rem', color: '#cbd5e1' }} /><p>No faculty members found for this department.</p></div>)}</div></div>{showAddFacultyModal && (<div className={styles.modalOverlay}><div className={styles.modalContent} style={{ maxWidth: '500px' }}><div className={styles.modalHeader}><h3>{editingFaculty ? 'Edit Faculty' : 'Add New Faculty'}</h3><button className={styles.closeBtn} onClick={() => setShowAddFacultyModal(false)}><X size={24} /></button></div><div className={styles.modalBody}><form onSubmit={handleAddFaculty} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}><div className={styles.formGroup}><label>Full Name</label><input value={facultyForm.fullName} onChange={e => setFacultyForm({ ...facultyForm, fullName: e.target.value })} required placeholder="e.g. Dr. John Doe" className={styles.input} /></div><div className={styles.formGroup}><label>Username</label><input value={facultyForm.username} onChange={e => setFacultyForm({ ...facultyForm, username: e.target.value })} required placeholder="jdoe" className={styles.input} />{editingFaculty && <small style={{ color: '#64748b', fontSize: '0.75rem' }}>⚠️ Changing the username will update the faculty's login ID.</small>}</div><div className={styles.formGroup}><label>Email</label><input value={facultyForm.email} onChange={e => setFacultyForm({ ...facultyForm, email: e.target.value })} type="email" required placeholder="john@college.edu" className={styles.input} /></div>{!editingFaculty && (<div className={styles.formGroup}><label>Temporary Password</label><input value={facultyForm.password} onChange={e => setFacultyForm({ ...facultyForm, password: e.target.value })} required placeholder="password123" className={styles.input} /></div>)}<div className={styles.formGroup}><label>Designation</label><select value={facultyForm.designation} onChange={e => setFacultyForm({ ...facultyForm, designation: e.target.value })} className={styles.input}><option>Assistant Professor</option><option>Associate Professor</option><option>Professor</option><option>Guest Faculty</option></select></div><div className={styles.formGroup}><label>CIE Role</label><select value={facultyForm.cieRole || ''} onChange={e => setFacultyForm({ ...facultyForm, cieRole: e.target.value })} className={styles.input}><option value=''>All CIEs (Default)</option><option value='THEORY'>Theory Only (CIE-1, 2, 5)</option><option value='LAB'>Lab Only (CIE-3, 4)</option></select><small style={{ color: '#64748b', fontSize: '0.75rem' }}>Set for subjects shared between Theory and Lab faculty.</small></div><div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}><button type="button" className={styles.secondaryBtn} onClick={() => setShowAddFacultyModal(false)}>Cancel</button><button type="submit" className={styles.primaryBtn} style={{ background: '#2563eb', color: 'white' }}>{editingFaculty ? 'Update Faculty' : 'Create Account'}</button></div></form></div></div></div>)}
                {viewingFaculty && (<div className={styles.modalOverlay} onClick={() => setViewingFaculty(null)}><div className={styles.modalContent} style={{ maxWidth: '700px' }} onClick={e => e.stopPropagation()}><div className={styles.modalHeader}><div><h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{viewingFaculty.fullName || viewingFaculty.username}</h2><span className={styles.badge} style={{ position: 'static', padding: '2px 8px', borderRadius: '4px', background: '#eff6ff', color: '#2563eb', fontWeight: 500, fontSize: '0.85rem' }}>Dashboard Overview</span></div><button className={styles.closeBtn} onClick={() => setViewingFaculty(null)}><X size={24} /></button></div><div className={styles.modalBody}>{(() => {
                    let totalAvg = 0;
                    let evaluatedCount = 0;
                    const subStats = parseSubjects(viewingFaculty.subjects).map(subName => {
                        const marks = subjectMarksData[subName] || [];
                        const validMarks = marks.filter(m => m.cie1Score !== null || m.cie2Score !== null || m.cie3Score !== null || m.cie4Score !== null || m.cie5Score !== null);
                        const avg = validMarks.length > 0 ? Math.round(validMarks.reduce((acc, m) => {
                            const scores = [m.cie1Score, m.cie2Score, m.cie3Score, m.cie4Score, m.cie5Score].filter(x => x !== null && x !== undefined);
                            const studentAvg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
                            return acc + studentAvg;
                        }, 0) / validMarks.length) : 0;

                        if (validMarks.length > 0) evaluatedCount += validMarks.length;
                        totalAvg += avg;
                        return { name: subName, avg, count: validMarks.length };
                    });
                    const overall = subStats.length > 0 ? Math.round(totalAvg / subStats.length) : 0;

                    return (<><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}><div className={styles.statCard} style={{ background: '#f8fafc', border: 'none' }}><div className={`${styles.iconBox} ${styles.blue}`}><TrendingUp size={20} /></div><div><p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Avg Class Score</p><h3 style={{ margin: 0, fontSize: '1.25rem' }}>{overall > 0 ? overall : '-'}/50</h3></div></div><div className={styles.statCard} style={{ background: '#f8fafc', border: 'none' }}><div className={`${styles.iconBox} ${styles.green}`}><CheckCircle size={20} /></div><div><p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Students Evaluated</p><h3 style={{ margin: 0, fontSize: '1.25rem' }}>{evaluatedCount}</h3></div></div></div><div><h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>Assigned Subjects Performance</h4><div className={styles.tableWrapper}><table className={styles.table}><thead><tr><th>Subject</th><th>Avg Score</th><th>Status</th></tr></thead><tbody>{subStats.length > 0 ? subStats.map((s, i) => (<tr key={i}><td style={{ fontWeight: 500 }}>{s.name}</td><td>{s.avg || '-'}</td><td><span style={{ color: s.avg >= 35 ? '#16a34a' : s.avg >= 20 ? '#ca8a04' : '#dc2626', fontWeight: 600 }}>{s.avg >= 35 ? 'Good' : s.avg >= 20 ? 'Average' : 'Need Improvement'}</span></td></tr>)) : (<tr><td colSpan="3" style={{ textAlign: 'center', color: '#94a3b8' }}>No subjects found</td></tr>)}</tbody></table></div></div></>);
                })()}</div></div></div>)}{messagingFaculty && (<div className={styles.modalOverlay} onClick={() => setMessagingFaculty(null)}><div className={styles.modalContent} style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}><div className={styles.modalHeader}><h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Mail size={20} /> Message {messagingFaculty.username}</h3><button className={styles.closeBtn} onClick={() => setMessagingFaculty(null)}><X size={24} /></button></div><div className={styles.modalBody}><div className={styles.formGroup}><label>Message Content</label><textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} placeholder="Type your message here..." className={styles.input} style={{ minHeight: '120px', resize: 'vertical' }} autoFocus></textarea></div><div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}><button className={styles.secondaryBtn} onClick={() => setMessagingFaculty(null)}>Cancel</button><button className={styles.primaryBtn} onClick={sendMessage} disabled={!messageText.trim()} style={{ opacity: !messageText.trim() ? 0.6 : 1 }}>Send Message</button></div></div></div></div>)}</div>)}
            {activeTab === 'approvals' && (<div className={styles.approvalsContainer}><div className={styles.infoBanner}><CheckCircle size={20} /><p>You have <strong>{pendingApprovals.length}</strong> IA Bundles pending for final approval.</p></div>{approvalLoading ? (<div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>Loading pending submissions...</div>) : pendingApprovals.length === 0 ? (<div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}><CheckCircle size={48} style={{ marginBottom: '1rem', color: '#10b981' }} /><p>No pending submissions. All marks have been reviewed!</p></div>) : (pendingApprovals.map((approval, idx) => (<div key={idx} className={styles.approvalCard}><div className={styles.approvalHeader}><div><h4>{approval.subjectName}</h4><span>{approval.iaType} Marks | Faculty: {approval.facultyName} | {approval.studentCount} students</span></div><div className={styles.approvlActions}><button className={styles.rejectBtn} onClick={() => handleRejectMarks(approval.subjectId, approval.iaType)}>Reject</button><button className={styles.approveBtn} onClick={() => handleApproveMarks(approval.subjectId, approval.iaType)}>Approve & Lock</button></div></div><table className={styles.miniTable}><thead><tr><th>Reg No</th><th>Student</th><th>Marks</th><th>Att (%)</th></tr></thead><tbody>{(Array.isArray(approval.marks) ? (expandedApprovals[idx] ? approval.marks : approval.marks.slice(0, 3)) : []).map(st => (<tr key={st.studentId}><td>{st.regNo}</td><td>{st.studentName}</td><td>{st.totalScore}/50</td><td style={{ color: st.attendancePercentage != null ? '#15803d' : '#94a3b8', fontWeight: 500 }}>{st.attendancePercentage != null ? `${st.attendancePercentage}%` : '-'}</td></tr>))}{Array.isArray(approval.marks) && approval.marks.length > 3 && (<tr onClick={() => toggleExpansion(idx)} style={{ cursor: 'pointer', background: '#f8fafc' }}><td colSpan="3" style={{ textAlign: 'center', color: '#2563eb', fontWeight: 500 }}>{expandedApprovals[idx] ? 'Show Less' : `+ ${approval.marks.length - 3} more records (Click to expand)`}</td></tr>)}</tbody></table></div>)))}<div className={styles.card} style={{ marginTop: '1.5rem' }}><div className={styles.cardHeader}><h3>🔓 Unlock Approved Marks</h3><p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '0.5rem' }}>Unlock approved marks to allow faculty to make corrections</p></div><div style={{ padding: '1.5rem' }}><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'end' }}><div><label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Subject</label><select className={styles.select} id="unlockSubject" style={{ width: '100%', padding: '0.6rem' }}><option value="">Select Subject</option>{subjects.filter(s => s.name !== 'IC').map(subject => (<option key={subject.id} value={subject.id}>{subject.name}</option>))}</select></div><div><label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>CIE Type</label><select className={styles.select} id="unlockCIE" style={{ width: '100%', padding: '0.6rem' }}><option value="CIE1">CIE-1</option><option value="CIE2">CIE-2</option><option value="CIE3">CIE-3</option><option value="CIE4">CIE-4</option><option value="CIE5">CIE-5</option></select></div><button className={styles.dangerBtn} onClick={() => { const subjectId = document.getElementById('unlockSubject').value; const cieType = document.getElementById('unlockCIE').value; if (!subjectId) { alert('Please select a subject'); return; } const subject = subjects.find(s => s.id === parseInt(subjectId)); handleUnlockMarks(subjectId, cieType, subject?.name || 'Selected Subject'); }} style={{ padding: '0.6rem 1.5rem' }}>Unlock Marks</button></div><div style={{ marginTop: '1rem', padding: '1rem', background: '#fef3c7', borderRadius: '0.5rem', fontSize: '0.85rem' }}><strong>⚠️ Warning:</strong> Unlocking marks will change their status from APPROVED to PENDING, allowing faculty to edit them again.</div></div></div></div>)}
            {activeTab === 'analytics' && (<div className={styles.analyticsContainer}><div className={styles.gridTwo}><div className={styles.card}><h3>IA Submission Status</h3><div className={styles.doughnutContainer}><Pie data={iaSubmissionStatus} options={doughnutOptions} /></div></div><div className={styles.card}><h3>Year-on-Year Improvement</h3><div className={styles.chartContainer}><Line data={hodTrendData} options={commonOptions} /></div></div></div><div className={styles.card} style={{ marginTop: '1.5rem' }}><h3>Download Reports</h3><div className={styles.downloadOptions}><button className={styles.downloadBtn}><FileText size={16} /> Department IA Report (PDF)</button><button className={styles.downloadBtn}><FileText size={16} /> Consolidated Marks Sheet (Excel)</button><button className={styles.downloadBtn}><FileText size={16} /> Low Performers List (CSV)</button></div></div></div>)}
            {activeTab === 'lesson-plans' && (<div className={styles.lessonPlansContainer}><div className={styles.card}><div className={styles.cardHeader}><h3>Department Syllabus Progress</h3></div><div className={styles.gridContainer} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(350px,1fr))', gap: '1.5rem', marginTop: '1rem' }}>{subjectsByDept[selectedDept]?.map((subName, idx) => { const subId = idx + 1; const realSub = subjects.find(s => s.name === subName); const idToUse = realSub ? realSub.id : subId; const savedTracker = localStorage.getItem('syllabusTracker'); const progress = savedTracker ? (JSON.parse(savedTracker)[idToUse] || {}) : {}; const savedStructure = localStorage.getItem('syllabusStructure'); const structure = savedStructure ? (JSON.parse(savedStructure)[idToUse] || []) : []; const savedCie = localStorage.getItem('cieSelector'); const cieSelector = savedCie ? (JSON.parse(savedCie)[idToUse] || {}) : {}; const units = structure.length > 0 ? structure : [{ id: 'u1', name: 'Unit 1: Introduction' }, { id: 'u2', name: 'Unit 2: Core Concepts' }, { id: 'u3', name: 'Unit 3: Advanced Topics' }, { id: 'u4', name: 'Unit 4: Application' }, { id: 'u5', name: 'Unit 5: Case Studies' }]; const completedCount = units.filter(u => progress[u.id]).length; const totalUnits = units.length; const percent = totalUnits > 0 ? Math.round((completedCount / totalUnits) * 100) : 0; return (<div key={idx} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem' }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}><div><h4 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem', color: '#111827' }}>{subName}</h4><span style={{ fontSize: '0.85rem', color: '#6b7280' }}>Faculty: {facultyWorkload[idx % facultyWorkload.length]?.name || 'Unknown'}</span></div><div style={{ textAlign: 'right' }}><span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: percent === 100 ? '#10b981' : '#3b82f6' }}>{percent}%</span></div></div><div style={{ height: '8px', background: '#f3f4f6', borderRadius: '4px', overflow: 'hidden', marginBottom: '1rem' }}><div style={{ width: `${percent}%`, height: '100%', background: percent === 100 ? '#10b981' : '#3b82f6', transition: 'width 0.5s ease' }}></div></div><div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>{units.slice(0, 3).map(u => (<div key={u.id} style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem', color: progress[u.id] ? '#374151' : '#9ca3af' }}><div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid', borderColor: progress[u.id] ? '#10b981' : '#d1d5db', background: progress[u.id] ? '#10b981' : 'transparent', marginRight: '8px', display: 'grid', placeItems: 'center', flexShrink: 0 }}>{progress[u.id] && <CheckCircle size={10} color="white" />}</div><span style={{ textDecoration: progress[u.id] ? 'line-through' : 'none', marginRight: '8px' }}>{u.name}</span>{cieSelector[u.id] && (<span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#7c3aed', backgroundColor: '#f5f3ff', padding: '1px 6px', borderRadius: '4px', border: '1px solid #7c3aed', marginLeft: 'auto' }}>CIE</span>)}</div>))}{units.length > 3 && (<div style={{ fontSize: '0.8rem', color: '#6b7280', paddingLeft: '24px' }}>+ {units.length - 3} more topics</div>)}</div></div>); })}</div></div></div>)}
            {activeTab === 'syllabus' && (<div className={styles.sectionContainer}>
                {/* Add New Subject Section */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}><h3><Layers size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />{editingSubject ? 'Edit Subject' : 'Add New Subject'}</h3></div>
                    <div style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                            <div className={styles.formGroup}>
                                <label style={{ fontWeight: 600 }}>Subject Name *</label>
                                <input className={styles.input} id="newSubjectName" placeholder="e.g. Data Structures" defaultValue={editingSubject?.name || ''} key={editingSubject ? `edit-name-${editingSubject.id}` : 'add-name'} />
                            </div>
                            <div className={styles.formGroup}>
                                <label style={{ fontWeight: 600 }}>Subject Code *</label>
                                <input className={styles.input} id="newSubjectCode" placeholder="e.g. 21CS32" defaultValue={editingSubject?.code || ''} key={editingSubject ? `edit-code-${editingSubject.id}` : 'add-code'} />
                            </div>
                            <div className={styles.formGroup}>
                                <label style={{ fontWeight: 600 }}>Semester</label>
                                <select className={styles.deptSelect} id="newSubjectSemester" style={{ width: '100%', padding: '0.6rem' }} defaultValue={editingSubject?.semester || '1'} key={editingSubject ? `edit-sem-${editingSubject.id}` : 'add-sem'}>
                                    {[1, 2, 3, 4, 5, 6].map(s => <option key={s} value={s}>Semester {s}</option>)}
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
                            {editingSubject && (
                                <button className={styles.secondaryBtn} style={{ flex: 1, justifyContent: 'center', padding: '0.65rem' }} onClick={() => setEditingSubject(null)}>Cancel</button>
                            )}
                            <button className={styles.primaryBtn} style={{ flex: editingSubject ? 2 : 1, width: '100%', justifyContent: 'center', padding: '0.65rem' }} onClick={async () => {
                                const name = document.getElementById('newSubjectName').value.trim();
                                const code = document.getElementById('newSubjectCode').value.trim();
                                const semester = document.getElementById('newSubjectSemester').value;
                                if (!name || !code) { alert('Subject name and code are required.'); return; }
                                try {
                                    const token = user?.token;
                                    const headers = { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) };
                                    const payload = { name, code, department: selectedDept, semester: parseInt(semester), credits: 0 };

                                    const url = editingSubject ? `${API_BASE_URL}/subjects/${editingSubject.id}` : `${API_BASE_URL}/subjects`;
                                    const method = editingSubject ? 'PUT' : 'POST';

                                    const res = await fetch(url, {
                                        method, headers,
                                        body: JSON.stringify(payload)
                                    });

                                    if (res.ok) {
                                        alert(editingSubject ? 'Subject updated successfully!' : 'Subject added successfully!');
                                        if (!editingSubject) {
                                            document.getElementById('newSubjectName').value = '';
                                            document.getElementById('newSubjectCode').value = '';
                                        }
                                        setEditingSubject(null);
                                        // Refresh subjects list
                                        const subRes = await fetch(`${API_BASE_URL}/subjects/department/${selectedDept}`, { headers: token ? { 'Authorization': `Bearer ${token}` } : {} });
                                        if (subRes.ok) setSubjects(await subRes.json());
                                    } else {
                                        const err = await res.json();
                                        alert(err.message || `Failed to ${editingSubject ? 'update' : 'add'} subject.`);
                                    }
                                } catch (e) { console.error(e); alert(`Error ${editingSubject ? 'updating' : 'adding'} subject.`); }
                            }}><Layers size={16} /> {editingSubject ? 'Update Subject' : 'Add Subject'}</button>
                        </div>
                    </div>
                </div>
                {/* Existing Subjects Table */}
                <div className={styles.card} style={{ marginTop: '1.5rem' }}>
                    <div className={styles.cardHeader}><h3>Department Subjects ({subjects.length})</h3></div>
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead><tr><th>Name</th><th>Code</th><th>Semester</th><th>Action</th></tr></thead>
                            <tbody>
                                {subjects.length > 0 ? subjects.map(sub => (
                                    <tr key={sub.id}>
                                        <td style={{ fontWeight: 500 }}>{sub.name}</td>
                                        <td><span className={styles.statusBadge} style={{ background: '#f1f5f9', color: '#334155' }}>{sub.code}</span></td>
                                        <td>Sem {sub.semester || '-'}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button className={styles.iconBtn} style={{ color: '#2563eb', background: '#dbeafe' }} title="Edit" onClick={() => {
                                                    setEditingSubject(sub);
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                }}><Edit size={14} /></button>
                                                <button className={styles.iconBtn} style={{ color: '#dc2626', background: '#fee2e2' }} title="Delete" onClick={async () => {
                                                    if (!window.confirm(`Delete subject "${sub.name}"? This cannot be undone.`)) return;
                                                    try {
                                                        const token = user?.token;
                                                        const res = await fetch(`${API_BASE_URL}/subjects/${sub.id}`, { method: 'DELETE', headers: token ? { 'Authorization': `Bearer ${token}` } : {} });
                                                        if (res.ok) {
                                                            setSubjects(prev => prev.filter(s => s.id !== sub.id));
                                                            if (editingSubject?.id === sub.id) setEditingSubject(null);
                                                            alert('Subject deleted.');
                                                        } else { alert('Failed to delete subject.'); }
                                                    } catch (e) { alert('Error deleting subject.'); }
                                                }}><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="6" style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>No subjects found for this department.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>)}
            {activeTab === 'cie-schedule' && (
                <div className={styles.cieScheduleContainer}>
                    <div className={styles.gridTwo}>
                        <div className={styles.card}>
                            <h3>{editingScheduleId ? 'Edit CIE Exam Schedule' : 'Schedule New CIE Exam'}</h3>
                            <form onSubmit={handleScheduleSubmit} id="scheduleFormSection" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div className={styles.formGroup}>
                                    <label>Select Subject</label>
                                    <select name="subjectId" required className={styles.deptSelect} style={{ width: '100%' }}>
                                        <option value="">-- Choose Subject --</option>
                                        {subjects.map(sub => (
                                            <option key={sub.id} value={sub.id}>{sub.name} ({sub.code})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>CIE Number</label>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {[1, 2, 3, 4, 5].map(num => (
                                            <label key={num} style={{
                                                flex: 1,
                                                padding: '0.75rem',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '8px',
                                                textAlign: 'center',
                                                cursor: 'pointer',
                                                background: scheduleForm.cieNumber === num ? '#eff6ff' : 'white',
                                                borderColor: scheduleForm.cieNumber === num ? '#3b82f6' : '#cbd5e1',
                                                color: scheduleForm.cieNumber === num ? '#2563eb' : '#64748b',
                                                fontWeight: scheduleForm.cieNumber === num ? '600' : '400'
                                            }}>
                                                <input type="radio" name="cieNumber" value={num} checked={scheduleForm.cieNumber === num} onChange={() => setScheduleForm({ ...scheduleForm, cieNumber: num })} style={{ display: 'none' }} />
                                                CIE-{num}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className={styles.formGroup}>
                                        <label>Date</label>
                                        <input type="date" name="scheduledDate" required className={styles.input} />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Time</label>
                                        <input type="time" name="startTime" required className={styles.input} />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className={styles.formGroup}>
                                        <label>Duration (mins)</label>
                                        <input type="number" name="durationMinutes" defaultValue="60" className={styles.input} />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Room / Hall</label>
                                        <input name="examRoom" placeholder="e.g. LH-201" className={styles.input} />
                                    </div>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Integration Instructions (Optional)</label>
                                    <textarea name="instructions" placeholder="Special instructions for faculty/students..." className={styles.input} style={{ minHeight: '80px', resize: 'vertical' }}></textarea>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                    {editingScheduleId && (
                                        <button type="button" className={styles.secondaryBtn} onClick={cancelEdit} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                                    )}
                                    <button type="submit" className={styles.primaryBtn} style={{ flex: 2, justifyContent: 'center' }}>
                                        <Megaphone size={18} /> {editingScheduleId ? 'Update Schedule' : 'Publish Schedule'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div className={styles.card}>
                            <h3>Upcoming Scheduled Exams</h3>
                            <div className={styles.alertList}>
                                {departmentAnnouncements.length > 0 ? departmentAnnouncements.map(ann => (
                                    <div key={ann.id} className={`${styles.alertItem} ${styles.info}`} style={{ alignItems: 'center' }}>
                                        <div style={{ background: 'white', padding: '0.5rem', borderRadius: '8px', textAlign: 'center', minWidth: '60px' }}>
                                            <span style={{ display: 'block', fontSize: '1.2rem', fontWeight: 'bold', color: '#2563eb' }}>
                                                {new Date(ann.scheduledDate).getDate()}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>
                                                {new Date(ann.scheduledDate).toLocaleString('default', { month: 'short' })}
                                            </span>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <h4 style={{ margin: '0 0 0.25rem', fontSize: '1rem', color: '#1e293b' }}>
                                                    {ann.subject ? ann.subject.name : 'Unknown Subject'}
                                                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'normal' }}> ({ann.subject?.code})</span>
                                                </h4>
                                                <span className={styles.statusBadge} style={{ background: '#dbeafe', color: '#1e40af' }}>CIE-{ann.cieNumber}</span>
                                            </div>
                                            <p style={{ display: 'flex', gap: '1rem', alignItems: 'center', color: '#475569', fontSize: '0.85rem' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {ann.startTime || '10:00 AM'} ({ann.durationMinutes}m)</span>
                                                {ann.examRoom && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12} /> {ann.examRoom}</span>}
                                            </p>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            {ann.questionPaperPath && (
                                                <>
                                                    <button className={styles.iconBtn} onClick={() => window.open(`${API_BASE_URL}/cie/download/${ann.questionPaperPath}?view=true`, '_blank')} title="View Question Paper" style={{ color: '#2563eb', background: '#dbeafe' }}>
                                                        <Eye size={16} />
                                                    </button>
                                                    <button className={styles.iconBtn} onClick={() => window.open(`${API_BASE_URL}/cie/download/${ann.questionPaperPath}`, '_blank')} title="Download Question Paper" style={{ color: '#16a34a', background: '#dcfce7' }}>
                                                        <Download size={16} />
                                                    </button>
                                                </>
                                            )}
                                            <button className={styles.iconBtn} onClick={() => handleEditSchedule(ann)} title="Edit" style={{ color: '#2563eb', background: '#dbeafe' }}>
                                                <Edit size={16} />
                                            </button>
                                            <button className={styles.iconBtn} onClick={() => handleDeleteSchedule(ann.id)} title="Delete" style={{ color: '#dc2626', background: '#fee2e2' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )) : (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No exams scheduled yet.</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* NEW: Question Paper Repository Section */}
                    <div className={styles.card} style={{ marginTop: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <FileText size={24} color="#2563eb" /> 📁 Question Paper Repository (Faculty Uploads)
                            </h3>
                            <span style={{ fontSize: '0.85rem', color: '#64748b', background: '#f1f5f9', padding: '4px 12px', borderRadius: '20px' }}>
                                {departmentAnnouncements.filter(a => a.questionPaperPath).length} Papers Uploaded
                            </span>
                        </div>
                        <div className={styles.tableWrapper}>
                            <table className={styles.table} style={{ width: '100%' }}>
                                <thead>
                                    <tr>
                                        <th>Subject</th>
                                        <th>CIE</th>
                                        <th>Uploaded By</th>
                                        <th>Status</th>
                                        <th style={{ textAlign: 'right' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {departmentAnnouncements.filter(a => a.questionPaperPath).length > 0 ? (
                                        departmentAnnouncements
                                            .filter(a => a.questionPaperPath)
                                            .sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate))
                                            .map(ann => (
                                                <tr key={ann.id}>
                                                    <td>
                                                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{ann.subject?.name}</div>
                                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{ann.subject?.code}</div>
                                                    </td>
                                                    <td>
                                                        <span className={styles.statusBadge} style={{ background: '#eff6ff', color: '#2563eb' }}>CIE-{ann.cieNumber}</span>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>
                                                                {ann.faculty?.username?.substring(0, 2).toUpperCase() || 'F'}
                                                            </div>
                                                            <span style={{ fontSize: '0.9rem' }}>{ann.faculty?.username || 'Unknown Faculty'}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontSize: '0.85rem', fontWeight: 500 }}>
                                                            <CheckCircle size={14} /> Ready for Review
                                                        </span>
                                                    </td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                            <button
                                                                className={styles.secondaryBtn}
                                                                style={{
                                                                    padding: '0.5rem 1rem',
                                                                    fontSize: '0.85rem',
                                                                    background: '#f8fafc',
                                                                    color: '#2563eb',
                                                                    border: '1px solid #cbd5e1',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '6px'
                                                                }}
                                                                onClick={() => window.open(`${API_BASE_URL}/cie/download/${ann.questionPaperPath}?view=true`, '_blank')}
                                                                title="View in Browser"
                                                            >
                                                                <Eye size={16} /> View
                                                            </button>
                                                            <button
                                                                className={styles.primaryBtn}
                                                                style={{
                                                                    padding: '0.5rem 1rem',
                                                                    fontSize: '0.85rem',
                                                                    background: '#16a34a',
                                                                    borderColor: '#16a34a',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '6px'
                                                                }}
                                                                onClick={() => window.open(`${API_BASE_URL}/cie/download/${ann.questionPaperPath}`, '_blank')}
                                                                title="Download File"
                                                            >
                                                                <Download size={16} /> Download
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                                                <FileText size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                                <p>No question papers have been uploaded by faculty yet.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
            {activeTab === 'reports' && (<div className={styles.sectionContainer}><h2 className={styles.sectionTitle}>Reports & Archives</h2><div className={styles.cardsGrid}><div className={styles.card}><div className={styles.cardHeader}><h3 className={styles.cardTitle}>IA Marks Report</h3></div><div style={{ padding: '1rem', color: '#666' }}><p>Download comprehensive PDF report of IA marks for all subjects in {selectedDept}.</p><button className={styles.primaryBtn} style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }} onClick={() => window.open(`${API_BASE_URL}/reports/marks/${selectedDept}/pdf`, '_blank')}><Download size={18} /> Download PDF</button></div></div></div></div>)}
            {activeTab === 'faculty-requests' && renderFacultyRequests()}
        </>
    );


    // ========== FACULTY ASSIGNMENT REQUESTS ==========
    const [pendingAssignments, setPendingAssignments] = useState([]);
    const [assignReqLoading, setAssignReqLoading] = useState(false);

    const fetchPendingAssignments = async () => {
        if (!selectedDept || !user?.token) return;
        setAssignReqLoading(true);
        try {
            const headers = { 'Authorization': `Bearer ${user.token}` };
            const res = await fetch(`${API_BASE_URL}/hod/assignment-requests?department=${encodeURIComponent(selectedDept)}&status=ALL`, { headers });
            if (res.ok) {
                const data = await res.json();
                setPendingAssignments(data);
            }
        } catch (e) { console.error("Failed to fetch assignment requests", e); }
        setAssignReqLoading(false);
    };

    const handleApproveRequest = async (requestId) => {
        if (!window.confirm('Are you sure you want to approve this assignment request?')) return;
        try {
            const headers = { 'Authorization': `Bearer ${user.token}`, 'Content-Type': 'application/json' };
            const res = await fetch(`${API_BASE_URL}/hod/assignment-requests/${requestId}/approve`, { method: 'PUT', headers });
            let data;
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await res.json();
            } else {
                const text = await res.text();
                data = { message: text || `Server returned status ${res.status}` };
            }
            if (res.ok) {
                alert(data.message || 'Request approved!');
                fetchPendingAssignments();
                // Refresh faculty list too
                const facRes = await fetch(`${API_BASE_URL}/hod/faculty?department=${selectedDept}`, { headers });
                if (facRes.ok) setFacultyList(await facRes.json());
            } else {
                console.error('Approve request failed:', res.status, data);
                alert(data.message || `Failed to approve (${res.status})`);
            }
        } catch (e) { console.error('Error approving request:', e); alert('Error approving request: ' + e.message); }
    };

    const handleRejectRequest = async (requestId) => {
        if (!window.confirm('Are you sure you want to reject this assignment request?')) return;
        try {
            const headers = { 'Authorization': `Bearer ${user.token}`, 'Content-Type': 'application/json' };
            const res = await fetch(`${API_BASE_URL}/hod/assignment-requests/${requestId}/reject`, { method: 'PUT', headers });
            let data;
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await res.json();
            } else {
                const text = await res.text();
                data = { message: text || `Server returned status ${res.status}` };
            }
            if (res.ok) {
                alert(data.message || 'Request rejected');
                fetchPendingAssignments();
            } else {
                console.error('Reject request failed:', res.status, data);
                alert(data.message || `Failed to reject (${res.status})`);
            }
        } catch (e) { console.error('Error rejecting request:', e); alert('Error rejecting request: ' + e.message); }
    };

    const renderFacultyRequests = () => {
        if (pendingAssignments.length === 0 && !assignReqLoading) fetchPendingAssignments();

        const statusColors = { PENDING: '#f59e0b', APPROVED: '#10b981', REJECTED: '#ef4444' };
        const statusBg = { PENDING: '#fef3c7', APPROVED: '#d1fae5', REJECTED: '#fef2f2' };

        const pending = pendingAssignments.filter(r => r.status === 'PENDING');
        const processed = pendingAssignments.filter(r => r.status !== 'PENDING');

        return (
            <div className={styles.facultyContainer}>
                <div className={styles.card}>
                    <div className={styles.cardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3><GitPullRequest size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                            Cross-Department Faculty Requests
                            {pending.length > 0 && (
                                <span style={{ marginLeft: '0.5rem', padding: '2px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600, background: '#fef3c7', color: '#f59e0b' }}>{pending.length} Pending</span>
                            )}
                        </h3>
                        <button className={styles.secondaryBtn} onClick={fetchPendingAssignments} style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
                            Refresh
                        </button>
                    </div>

                    {/* Pending Requests */}
                    {pending.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                            {pending.map(req => (
                                <div key={req.id} style={{ border: '2px solid #fde68a', borderRadius: '12px', padding: '1.25rem', background: '#fffbeb' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                        <div>
                                            <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#1e293b' }}>{req.facultyName}</span>
                                            <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>Faculty ID: {req.facultyId}</span>
                                        </div>
                                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, color: statusColors[req.status], background: statusBg[req.status] }}>
                                            {req.status}
                                        </span>
                                    </div>
                                    <div style={{ marginBottom: '0.75rem' }}>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Requested Subjects</span>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.3rem' }}>
                                            {req.subjects.split(',').map((sub, i) => (
                                                <span key={i} style={{ fontSize: '0.8rem', background: '#fff', padding: '3px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', color: '#475569' }}>
                                                    {sub.trim()}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    {req.sections && (
                                        <div style={{ marginBottom: '0.75rem', fontSize: '0.85rem', color: '#64748b' }}>
                                            <strong>Sections:</strong> {req.sections}
                                        </div>
                                    )}
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1rem' }}>
                                        Requested: {req.requestDate ? new Date(req.requestDate).toLocaleString() : '-'}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            className={styles.primaryBtn}
                                            onClick={() => handleApproveRequest(req.id)}
                                            style={{ flex: 1, justifyContent: 'center', background: '#16a34a', padding: '0.5rem' }}
                                        >
                                            <CheckCircle size={16} /> Approve
                                        </button>
                                        <button
                                            className={styles.secondaryBtn}
                                            onClick={() => handleRejectRequest(req.id)}
                                            style={{ flex: 1, justifyContent: 'center', color: '#dc2626', borderColor: '#fecaca', background: '#fef2f2', padding: '0.5rem' }}
                                        >
                                            <X size={16} /> Reject
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                            <GitPullRequest size={48} style={{ marginBottom: '0.5rem', color: '#cbd5e1' }} />
                            <p>No pending faculty assignment requests for {selectedDept}.</p>
                        </div>
                    )}
                </div>

                {/* Processed Requests History */}
                {processed.length > 0 && (
                    <div className={styles.card} style={{ marginTop: '1.5rem' }}>
                        <div className={styles.cardHeader}>
                            <h3>Request History</h3>
                        </div>
                        <table className={styles.table} style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <th>Faculty</th>
                                    <th>Subjects</th>
                                    <th>Sections</th>
                                    <th>Status</th>
                                    <th>Responded On</th>
                                </tr>
                            </thead>
                            <tbody>
                                {processed.map(req => (
                                    <tr key={req.id}>
                                        <td style={{ fontWeight: 500 }}>{req.facultyName}</td>
                                        <td style={{ fontSize: '0.9rem' }}>{req.subjects}</td>
                                        <td>{req.sections || '-'}</td>
                                        <td>
                                            <span style={{
                                                padding: '0.2rem 0.6rem', borderRadius: '8px',
                                                fontSize: '0.8rem', fontWeight: 600,
                                                color: statusColors[req.status], background: statusBg[req.status]
                                            }}>{req.status}</span>
                                        </td>
                                        <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                            {req.responseDate ? new Date(req.responseDate).toLocaleDateString() : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };


    if (isSpectator) {
        // Spectator mode (embedded from PrincipalDashboard) - no DashboardLayout
        return (
            <div style={{ padding: '1rem', height: 'auto', overflow: 'visible' }}>
                <header style={{ marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{departments.find(d => d.id === selectedDept)?.name} Console</h2>
                        <span style={{ fontSize: '0.85rem', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>Read-Only Mode</span>
                    </div>
                    <nav style={{ display: 'flex', gap: '10px' }}>
                        {menuItems.filter(m => ['overview', 'monitoring', 'performance', 'all-students'].includes(m.path.replace('#', ''))).map((item, index) => (
                            <button key={index}
                                onClick={() => setActiveTab(item.path.replace('#', ''))}
                                style={{
                                    padding: '0.5rem 1rem', borderRadius: '8px', border: 'none',
                                    background: activeTab === item.path.replace('#', '') ? '#3b82f6' : 'transparent',
                                    color: activeTab === item.path.replace('#', '') ? 'white' : '#64748b',
                                    cursor: 'pointer', fontWeight: 500
                                }}>
                                {item.label}
                            </button>
                        ))}
                    </nav>
                </header>
                <div>
                    {!isMyDept ? (<AccessDeniedView />) : renderContent()}
                </div>
                {renderStudentProfileModal()}
                {renderResetPasswordModal()}
            </div>
        );
    }

    return (
        <DashboardLayout menuItems={menuItems}>
            {/* Faculty-style Header */}
            <header className={styles.header}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                        <h1 className={styles.welcomeTextBig}>Hello, {user?.fullName || user?.username}</h1>
                        <p className={styles.subtitle}>HOD | {user?.username || 'HOD'}</p>
                    </div>
                </div>
            </header>
            <div className={styles.scrollableContent} style={activeTab === 'update-marks' ? { padding: '2rem 0' } : {}}>
                {!isMyDept ? (<AccessDeniedView />) : renderContent()}
            </div>
            {renderStudentProfileModal()}
            {renderResetPasswordModal()}
        </DashboardLayout>
    );
};

export default HODDashboard;
