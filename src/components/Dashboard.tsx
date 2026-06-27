import React, { useState, useMemo } from 'react';
import { AppUser, Dataset } from '../types';
import { Plus, Trash2, Edit2, Search, Filter, MoreVertical, CheckCircle2, Circle, Clock, ArrowLeft, RotateCcw, Settings, LogOut, X, User as UserIcon, RefreshCw, Copy } from 'lucide-react';

interface DashboardProps {
  datasets: Dataset[];
  onAddDataset: (dataset: Omit<Dataset, 'id' | 'data' | 'deletedAt' | 'userId'>) => void;
  onEditDataset: (id: string, updates: Partial<Dataset>) => void;
  onDuplicateDataset: (id: string, newMetadata: { learningArea: string, subjectName: string, gradeLevel: string, headOfLearningArea: string }) => void;
  onDeleteDataset: (ids: string[]) => void;
  onRestoreDataset: (ids: string[]) => void;
  onPermanentDelete: (ids: string[]) => void;
  onSelectDataset: (id: string) => void;
  onLogout: () => void;
  onSettings: () => void;
  onRefresh: () => void;
  currentUser: AppUser;
  unreadNotifications: number;
}

export const Dashboard: React.FC<DashboardProps> = ({
  datasets,
  onAddDataset,
  onEditDataset,
  onDuplicateDataset,
  onDeleteDataset,
  onRestoreDataset,
  onPermanentDelete,
  onSelectDataset,
  onLogout,
  onSettings,
  onRefresh,
  currentUser,
  unreadNotifications,
}) => {
  const [isTrashView, setIsTrashView] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterSemester, setFilterSemester] = useState<string>('all');
  const [filterArea, setFilterArea] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDatasetId, setEditingDatasetId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateSourceId, setDuplicateSourceId] = useState<string | null>(null);
  const [duplicateError, setDuplicateError] = useState('');
  const [duplicateDataset, setDuplicateDataset] = useState({
    learningArea: '',
    subjectName: '',
    grade: '',
    room: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 100;

  // Form state for new dataset
  const [newDataset, setNewDataset] = useState({
    name: '',
    academicYear: new Date().getFullYear() + 543 + '',
    semester: '1',
    subjectName: '',
    learningArea: 'วิทยาศาสตร์และเทคโนโลยี',
    grade: 'ม.3',
    room: '1',
    status: 'not_started' as const,
  });

  // Form state for editing dataset
  const [editDataset, setEditDataset] = useState({
    name: '',
    academicYear: '',
    semester: '',
    subjectName: '',
    learningArea: '',
    grade: '',
    room: '',
    status: 'not_started' as const,
  });

  const learningAreas = [
    'ภาษาไทย',
    'คณิตศาสตร์',
    'วิทยาศาสตร์และเทคโนโลยี',
    'สังคมศึกษา ศาสนา และวัฒนธรรม',
    'สุขศึกษาและพลศึกษา',
    'ศิลปะ',
    'การงานอาชีพ',
    'ภาษาต่างประเทศ'
  ];

  const subjectsByArea: Record<string, string[]> = {
    'ภาษาไทย': ['ภาษาไทยพื้นฐาน', 'ภาษาไทยเพิ่มเติม'],
    'คณิตศาสตร์': ['คณิตศาสตร์พื้นฐาน', 'คณิตศาสตร์เพิ่มเติม'],
    'วิทยาศาสตร์และเทคโนโลยี': ['วิทยาศาสตร์พื้นฐาน', 'วิทยาการคำนวณ', 'การออกแบบและเทคโนโลยี', 'ฟิสิกส์', 'เคมี', 'ชีววิทยา', 'สวนพฤกษศาสตร์'],
    'สังคมศึกษา ศาสนา และวัฒนธรรม': ['สังคมศึกษา', 'ประวัติศาสตร์', 'หน้าที่พลเมือง', 'เศรษฐศาสตร์', 'ภูมิศาสตร์'],
    'สุขศึกษาและพลศึกษา': ['สุขศึกษา', 'พลศึกษา'],
    'ศิลปะ': ['ทัศนศิลป์', 'ดนตรี', 'นาฏศิลป์'],
    'การงานอาชีพ': ['การงานอาชีพ', 'คอมพิวเตอร์', 'พื้นฐานอาชีพ'],
    'ภาษาต่างประเทศ': ['ภาษาอังกฤษพื้นฐาน', 'ภาษาอังกฤษเพิ่มเติม', 'ภาษาจีน', 'ภาษาญี่ปุ่น']
  };

  const getHeadOfLearningArea = (area: string, subject: string) => {
    let head = '';
    switch (area) {
      case 'ภาษาไทย': head = 'นางสาวพรชิตา ภูแสงสั่น'; break;
      case 'คณิตศาสตร์': head = 'นางสาวราตรี ภูจอมแก้ว'; break;
      case 'วิทยาศาสตร์และเทคโนโลยี': 
        head = subject === 'สวนพฤกษศาสตร์' ? 'นางสาวพิรยา คำปัน' : 'นางสาววันวิสา พลหมอ'; 
        break;
      case 'สังคมศึกษา ศาสนา และวัฒนธรรม': head = 'นายบุญเลิศ อังคเนตร'; break;
      case 'สุขศึกษาและพลศึกษา': head = 'นายทนงเดช วงษ์ประจันต์'; break;
      case 'ศิลปะ': head = 'นายวสันต์ วอแพง'; break;
      case 'ภาษาต่างประเทศ': head = 'นางสาวพรนิภา สว่างศรี'; break;
      case 'การงานอาชีพ': head = 'นางสาวสุภาพร ญาณประเสริฐ'; break;
    }
    return head;
  };

  const handleDuplicateClick = (dataset: Dataset) => {
    setDuplicateSourceId(dataset.id);
    const [grade, room] = dataset.gradeLevel.split('/');
    setDuplicateDataset({
      learningArea: dataset.learningArea,
      subjectName: dataset.subjectName,
      grade: grade || 'ม.3',
      room: room || '1'
    });
    setDuplicateError('');
    setShowDuplicateModal(true);
  };

  const handleDuplicateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sourceDataset = datasets.find(d => d.id === duplicateSourceId);
    if (!sourceDataset || !duplicateSourceId) return;

    const newGradeLevel = `${duplicateDataset.grade}/${duplicateDataset.room}`;
    
    // Check if at least one of the 3 fields changed
    if (
      duplicateDataset.learningArea === sourceDataset.learningArea &&
      duplicateDataset.subjectName === sourceDataset.subjectName &&
      newGradeLevel === sourceDataset.gradeLevel
    ) {
      setDuplicateError('กรุณาเปลี่ยนแปลงข้อมูลอย่างน้อย 1 อย่าง (กลุ่มสาระ, รายวิชา หรือ ระดับชั้น)');
      return;
    }

    // Check for duplicates
    const isDuplicate = datasets.some(d => 
      !d.deletedAt && 
      d.userId === currentUser.id &&
      d.learningArea === duplicateDataset.learningArea &&
      d.subjectName === duplicateDataset.subjectName &&
      d.gradeLevel === newGradeLevel &&
      d.academicYear === sourceDataset.academicYear &&
      d.semester === sourceDataset.semester
    );

    if (isDuplicate) {
      setDuplicateError('มีข้อมูลชุดนี้อยู่แล้วในระบบ');
      return;
    }

    const headOfLearningArea = getHeadOfLearningArea(duplicateDataset.learningArea, duplicateDataset.subjectName);

    onDuplicateDataset(duplicateSourceId, {
      learningArea: duplicateDataset.learningArea,
      subjectName: duplicateDataset.subjectName,
      gradeLevel: newGradeLevel,
      headOfLearningArea
    });
    
    setShowDuplicateModal(false);
  };

  const activeDatasets = datasets.filter(d => !d.deletedAt);
  const trashedDatasets = datasets.filter(d => d.deletedAt);

  const currentList = isTrashView ? trashedDatasets : activeDatasets;

  const filteredList = useMemo(() => {
    return currentList.filter(d => {
      const matchYear = filterYear === 'all' || d.academicYear === filterYear;
      const matchSemester = filterSemester === 'all' || d.semester === filterSemester;
      const matchArea = filterArea === 'all' || d.learningArea === filterArea;
      return matchYear && matchSemester && matchArea;
    });
  }, [currentList, filterYear, filterSemester, filterArea]);

  const totalPages = Math.ceil(filteredList.length / rowsPerPage) || 1;
  const paginatedList = filteredList.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const uniqueYears = Array.from(new Set(activeDatasets.map(d => d.academicYear))).sort().reverse();
  const uniqueSemesters = Array.from(new Set(activeDatasets.map(d => d.semester))).sort();
  const uniqueAreas = Array.from(new Set(activeDatasets.map(d => d.learningArea))).sort();

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredList.map(d => d.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { grade, room, ...rest } = newDataset;
    onAddDataset({
      ...rest,
      gradeLevel: `${grade}/${room}`
    });
    setShowAddModal(false);
    setNewDataset({
      name: '',
      academicYear: new Date().getFullYear() + 543 + '',
      semester: '1',
      subjectName: '',
      learningArea: 'วิทยาศาสตร์และเทคโนโลยี',
      grade: 'ม.3',
      room: '1',
      status: 'not_started',
    });
  };

  const handleEditClick = (dataset: Dataset) => {
    const [grade, room] = dataset.gradeLevel.split('/');
    setEditDataset({
      name: dataset.name,
      academicYear: dataset.academicYear,
      semester: dataset.semester,
      subjectName: dataset.subjectName,
      learningArea: dataset.learningArea,
      grade: grade || 'ม.3',
      room: room || '1',
      status: dataset.status,
    });
    setEditingDatasetId(dataset.id);
    setShowEditModal(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowEditConfirm(true);
  };

  const confirmEdit = () => {
    if (editingDatasetId) {
      const { grade, room, ...rest } = editDataset;
      onEditDataset(editingDatasetId, {
        ...rest,
        gradeLevel: `${grade}/${room}`
      });
      setShowEditConfirm(false);
      setShowEditModal(false);
      setEditingDatasetId(null);
    }
  };

  const handleDeleteSelected = () => {
    if (isTrashView) {
      onPermanentDelete(selectedIds);
    } else {
      onDeleteDataset(selectedIds);
    }
    setSelectedIds([]);
    setShowDeleteConfirm(false);
  };

  const handleRestoreSelected = () => {
    onRestoreDataset(selectedIds);
    setSelectedIds([]);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500 text-white border-transparent';
      case 'in_progress':
        return 'bg-amber-500 text-white border-transparent';
      default:
        return 'bg-slate-100 text-slate-500 border-transparent';
    }
  };

  return (
    <div className="h-screen overflow-y-auto bg-[#f7f8fa] font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-100 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <img 
              src="/logo3.png" 
              alt="KSP GradeBook Logo" 
              className="w-12 h-12 mr-4 object-contain drop-shadow-sm"
            />
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                KSP GradeBook
              </h1>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5 tracking-wide uppercase">
                ระบบบันทึกคะแนนวัดผลประเมินผลการเรียนรู้ดิจิทัล
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-slate-100 rounded-full px-4 py-2">
              <div className="w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center text-white font-bold mr-2">
                {currentUser.name.charAt(0)}
              </div>
              <span className="text-sm font-medium text-slate-700 mr-4">{currentUser.name}</span>
              <button onClick={onRefresh} className="text-slate-500 hover:text-blue-600 transition-colors mr-3 relative" title="รีเฟรชข้อมูล">
                <RefreshCw className="w-4 h-4" />
              </button>
              {(currentUser.role === 'super_admin' || currentUser.role === 'admin') && (
                <button onClick={onSettings} className="text-slate-500 hover:text-blue-600 transition-colors mr-3 relative" title="ตั้งค่าระบบ">
                  <Settings className="w-4 h-4" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full border border-white">
                      {unreadNotifications}
                    </span>
                  )}
                </button>
              )}
              <button onClick={onLogout} className="text-slate-500 hover:text-red-600 transition-colors" title="ออกจากระบบ">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-8 pb-[200px] max-w-7xl mx-auto">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              {isTrashView ? 'ถังขยะ' : 'เลือกปีการศึกษา'}
            </h2>
            <p className="text-slate-500">
              {isTrashView ? 'ชุดข้อมูลที่ถูกลบจะถูกเก็บไว้ 60 วันก่อนลบถาวร' : 'จัดการข้อมูลการบันทึกคะแนนตามปีการศึกษา'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {isTrashView ? (
              <button 
                onClick={() => setIsTrashView(false)}
                className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                กลับไปหน้าหลัก
              </button>
            ) : (
              <>
                <div className="flex bg-white border border-slate-200 rounded-xl shadow-sm p-1">
                  <select 
                    value={filterYear} 
                    onChange={(e) => setFilterYear(e.target.value)}
                    className="bg-transparent border-none text-sm text-slate-700 focus:ring-0 cursor-pointer pl-3 pr-8 py-1.5"
                  >
                    <option value="all">ทุกปีการศึกษา</option>
                    {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <div className="w-px bg-slate-200 mx-1 my-1"></div>
                  <select 
                    value={filterSemester} 
                    onChange={(e) => setFilterSemester(e.target.value)}
                    className="bg-transparent border-none text-sm text-slate-700 focus:ring-0 cursor-pointer pl-3 pr-8 py-1.5"
                  >
                    <option value="all">ทุกภาคเรียน</option>
                    {uniqueSemesters.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <div className="w-px bg-slate-200 mx-1 my-1"></div>
                  <select 
                    value={filterArea} 
                    onChange={(e) => setFilterArea(e.target.value)}
                    className="bg-transparent border-none text-sm text-slate-700 focus:ring-0 cursor-pointer pl-3 pr-8 py-1.5"
                  >
                    <option value="all">ทุกกลุ่มสาระฯ</option>
                    {uniqueAreas.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-md"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  บันทึกผลการเรียนใหม่
                </button>
              </>
            )}
          </div>
        </div>

        {/* Action Bar for Selection */}
        {selectedIds.length > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex justify-between items-center shadow-sm animate-in fade-in slide-in-from-top-2">
            <span className="text-blue-800 font-medium">เลือก {selectedIds.length} รายการ</span>
            <div className="flex gap-3">
              <button 
                onClick={() => setSelectedIds([])}
                className="px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors"
              >
                ยกเลิก
              </button>
              {isTrashView ? (
                <>
                  <button 
                    onClick={handleRestoreSelected}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium transition-colors shadow-sm flex items-center"
                  >
                    <RotateCcw className="w-4 h-4 mr-1.5" />
                    กู้คืนข้อมูล
                  </button>
                  <button 
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors shadow-sm flex items-center"
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    ลบถาวร
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors shadow-sm flex items-center"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  ลบข้อมูล
                </button>
              )}
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 text-sm">
                  <th className="py-4 px-6 w-12 text-center">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.length === filteredList.length && filteredList.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-4 px-4 font-medium">ปีการศึกษา</th>
                  <th className="py-4 px-4 font-medium">ภาคเรียนที่</th>
                  <th className="py-4 px-4 font-medium">กลุ่มสาระฯ</th>
                  <th className="py-4 px-4 font-medium">ระดับชั้น</th>
                  <th className="py-4 px-4 font-medium">รายวิชา</th>
                  <th className="py-4 px-4 font-medium text-center">จำนวนนักเรียน</th>
                  <th className="py-4 px-4 font-medium">สถานะ</th>
                  <th className="py-4 px-4 font-medium text-center">สำเนา</th>
                  <th className="py-4 px-6 font-medium text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      ไม่พบข้อมูล
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((dataset) => (
                    <tr 
                      key={dataset.id} 
                      className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                      onClick={() => onSelectDataset(dataset.id)}
                    >
                      <td className="py-4 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(dataset.id)}
                          onChange={() => handleSelectOne(dataset.id)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-4 px-4 font-semibold text-slate-900">{dataset.academicYear}</td>
                      <td className="py-4 px-4 text-slate-600">{dataset.semester}</td>
                      <td className="py-4 px-4">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                          {dataset.learningArea}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-sm font-medium">
                          {dataset.gradeLevel}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-slate-900 font-medium">
                          {dataset.subjectName}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center font-medium text-slate-700">
                        {dataset.data?.students?.length || 0}
                      </td>
                      <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="relative inline-block w-40">
                          <select 
                            value={dataset.status}
                            onChange={(e) => onEditDataset(dataset.id, { status: e.target.value as any })}
                            className={`appearance-none w-full pl-8 pr-8 py-2 rounded-full text-sm font-medium outline-none cursor-pointer transition-colors ${getStatusStyle(dataset.status)}`}
                            disabled={isTrashView}
                          >
                            <option value="not_started" className="bg-white text-slate-900">ยังไม่เริ่ม</option>
                            <option value="in_progress" className="bg-white text-slate-900">อยู่ระหว่างดำเนินการ</option>
                            <option value="completed" className="bg-white text-slate-900">เสร็จสิ้น</option>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-current opacity-70">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                          </div>
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-current opacity-70">
                            <div className="w-2 h-2 rounded-full bg-current opacity-50"></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        {!isTrashView && (
                          <button 
                            onClick={() => handleDuplicateClick(dataset)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200"
                            title="ทำสำเนาข้อมูลชุดนี้"
                          >
                            <Copy className="w-4 h-4" />
                            สำเนา
                          </button>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        {!isTrashView && (
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => {
                                handleEditClick(dataset);
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="แก้ไขรายละเอียด"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => {
                                setSelectedIds([dataset.id]);
                                setShowDeleteConfirm(true);
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="ลบ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
            <div className="text-sm text-slate-500">
              แสดงหน้า <span className="font-medium text-slate-900">{currentPage}</span> จาก <span className="font-medium text-slate-900">{totalPages}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                ก่อนหน้า
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                ถัดไป
              </button>
            </div>
          </div>
        </div>

        {/* Trash Button Float */}
        {!isTrashView && (
          <button 
            onClick={() => setIsTrashView(true)}
            className="fixed bottom-24 right-8 z-50 w-14 h-14 bg-white rounded-full shadow-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:text-red-500 hover:border-red-200 transition-all hover:scale-105"
            title="ถังขยะ"
          >
            <Trash2 className="w-6 h-6" />
            {trashedDatasets.length > 0 && (
              <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white">
                {trashedDatasets.length}
              </span>
            )}
          </button>
        )}

        {/* Footer Credit */}
        <footer className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-sm border-t border-white/10 py-4 z-40">
          <div className="max-w-7xl mx-auto px-4 flex flex-col items-center justify-center text-sm">
            <p className="text-white font-medium mb-1">พัฒนาโดย ครูธนิท ธนพัตนิรัชกุล</p>
            <p className="text-white/80">KSP GradeBook</p>
          </div>
        </footer>
      </main>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">บันทึกผลการเรียนใหม่</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div className="hidden">
                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อชุดข้อมูล</label>
                <input 
                  type="text" 
                  value={newDataset.name}
                  onChange={e => setNewDataset({...newDataset, name: e.target.value})}
                  className="w-full border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ปีการศึกษา</label>
                  <select 
                    required
                    value={newDataset.academicYear}
                    onChange={e => setNewDataset({...newDataset, academicYear: e.target.value})}
                    className="w-full border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none bg-white"
                  >
                    {Array.from({ length: 10 }, (_, i) => (new Date().getFullYear() + 543 - 5 + i).toString()).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ภาคเรียนที่</label>
                  <select 
                    value={newDataset.semester}
                    onChange={e => setNewDataset({...newDataset, semester: e.target.value})}
                    className="w-full border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="1">1</option>
                    <option value="2">2</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ระดับชั้น</label>
                  <select 
                    required
                    value={newDataset.grade}
                    onChange={e => setNewDataset({...newDataset, grade: e.target.value})}
                    className="w-full border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="ม.3">ม.3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ห้องที่</label>
                  <select 
                    required
                    value={newDataset.room}
                    onChange={e => setNewDataset({...newDataset, room: e.target.value})}
                    className="w-full border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    {[1, 2, 3, 4, 5].map(room => (
                      <option key={room} value={room}>{room}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">กลุ่มสาระการเรียนรู้</label>
                <select 
                  required
                  value={newDataset.learningArea}
                  onChange={e => setNewDataset({...newDataset, learningArea: e.target.value, subjectName: subjectsByArea[e.target.value]?.[0] || ''})}
                  className="w-full border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  {learningAreas.map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">รายวิชา</label>
                <select 
                  required
                  value={newDataset.subjectName}
                  onChange={e => setNewDataset({...newDataset, subjectName: e.target.value})}
                  className="w-full border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">เลือกรายวิชา</option>
                  {subjectsByArea[newDataset.learningArea]?.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                  <option value="other">อื่นๆ (ระบุเอง)</option>
                </select>
                {newDataset.subjectName === 'other' && (
                  <input 
                    type="text" 
                    required
                    className="mt-2 w-full border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="ระบุชื่อวิชา"
                    onChange={e => setNewDataset({...newDataset, subjectName: e.target.value})}
                  />
                )}
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-md"
                >
                  บันทึกผลการเรียนใหม่
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">แก้ไขข้อมูลการบันทึกผลการเรียน</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="hidden">
                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อชุดข้อมูล</label>
                <input 
                  type="text" 
                  value={editDataset.name}
                  onChange={e => setEditDataset({...editDataset, name: e.target.value})}
                  className="w-full border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="เช่น ผลการเรียน ม.3/1 เทอม 1/2567"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ปีการศึกษา</label>
                  <input 
                    type="text" 
                    required
                    value={editDataset.academicYear}
                    onChange={e => setEditDataset({...editDataset, academicYear: e.target.value})}
                    className="w-full border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="เช่น 2567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ภาคเรียนที่</label>
                  <select 
                    required
                    value={editDataset.semester}
                    onChange={e => setEditDataset({...editDataset, semester: e.target.value})}
                    className="w-full border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="1">1</option>
                    <option value="2">2</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ระดับชั้น</label>
                  <select 
                    required
                    value={editDataset.grade}
                    onChange={e => setEditDataset({...editDataset, grade: e.target.value})}
                    className="w-full border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="ม.1">ม.1</option>
                    <option value="ม.2">ม.2</option>
                    <option value="ม.3">ม.3</option>
                    <option value="ม.4">ม.4</option>
                    <option value="ม.5">ม.5</option>
                    <option value="ม.6">ม.6</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ห้องที่</label>
                  <select 
                    required
                    value={editDataset.room}
                    onChange={e => setEditDataset({...editDataset, room: e.target.value})}
                    className="w-full border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <option key={num} value={num.toString()}>{num}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">กลุ่มสาระการเรียนรู้</label>
                <select 
                  required
                  value={editDataset.learningArea}
                  onChange={e => setEditDataset({...editDataset, learningArea: e.target.value, subjectName: subjectsByArea[e.target.value]?.[0] || ''})}
                  className="w-full border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  {learningAreas.map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">รายวิชา</label>
                <select 
                  required
                  value={editDataset.subjectName}
                  onChange={e => setEditDataset({...editDataset, subjectName: e.target.value})}
                  className="w-full border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">เลือกรายวิชา</option>
                  {subjectsByArea[editDataset.learningArea]?.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                  <option value="other">อื่นๆ (ระบุเอง)</option>
                </select>
                {editDataset.subjectName === 'other' && (
                  <input 
                    type="text" 
                    required
                    className="mt-2 w-full border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="ระบุชื่อวิชา"
                    onChange={e => setEditDataset({...editDataset, subjectName: e.target.value})}
                  />
                )}
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-md"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Duplicate Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-green-600 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <Copy className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold">ทำสำเนาข้อมูล</h2>
              </div>
              <button 
                onClick={() => setShowDuplicateModal(false)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleDuplicateSubmit} className="p-6 space-y-4">
              {duplicateError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-100 flex items-center gap-2">
                  <Circle className="w-4 h-4 fill-current" />
                  {duplicateError}
                </div>
              )}
              
              <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm mb-4 border border-blue-100">
                กรุณาเปลี่ยนแปลงข้อมูลอย่างน้อย 1 อย่าง (กลุ่มสาระ, รายวิชา หรือ ระดับชั้น) เพื่อไม่ให้ข้อมูลซ้ำกัน
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">กลุ่มสาระการเรียนรู้</label>
                <select 
                  required
                  value={duplicateDataset.learningArea}
                  onChange={e => setDuplicateDataset({...duplicateDataset, learningArea: e.target.value, subjectName: subjectsByArea[e.target.value]?.[0] || ''})}
                  className="w-full border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                >
                  {learningAreas.map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">รายวิชา</label>
                <select 
                  required
                  value={duplicateDataset.subjectName}
                  onChange={e => setDuplicateDataset({...duplicateDataset, subjectName: e.target.value})}
                  className="w-full border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                >
                  <option value="">เลือกรายวิชา</option>
                  {subjectsByArea[duplicateDataset.learningArea]?.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                  <option value="other">อื่นๆ (ระบุเอง)</option>
                </select>
                {duplicateDataset.subjectName === 'other' && (
                  <input 
                    type="text" 
                    required
                    className="mt-2 w-full border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    placeholder="ระบุชื่อวิชา"
                    onChange={e => setDuplicateDataset({...duplicateDataset, subjectName: e.target.value})}
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ระดับชั้น</label>
                  <select 
                    required
                    value={duplicateDataset.grade}
                    onChange={e => setDuplicateDataset({...duplicateDataset, grade: e.target.value})}
                    className="w-full border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  >
                    <option value="ม.3">ม.3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ห้องที่</label>
                  <select 
                    required
                    value={duplicateDataset.room}
                    onChange={e => setDuplicateDataset({...duplicateDataset, room: e.target.value})}
                    className="w-full border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  >
                    {[1, 2, 3, 4, 5].map(room => (
                      <option key={room} value={room}>{room}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setShowDuplicateModal(false)}
                  className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 bg-green-600 text-white hover:bg-green-700 rounded-xl font-medium transition-colors shadow-sm"
                >
                  ยืนยันการทำสำเนา
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Confirm Modal */}
      {showEditConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 p-6 text-center">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Edit2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">ยืนยันการแก้ไขข้อมูล</h3>
            <p className="text-slate-500 mb-6">
              คุณต้องการบันทึกการแก้ไขข้อมูลชุดนี้ใช่หรือไม่? ข้อมูลที่เกี่ยวข้องจะถูกอัปเดตตามไปด้วย
            </p>
            <div className="flex justify-center gap-3">
              <button 
                onClick={() => setShowEditConfirm(false)}
                className="px-5 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition-colors flex-1"
              >
                ยกเลิก
              </button>
              <button 
                onClick={confirmEdit}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-md flex-1"
              >
                ยืนยันการแก้ไข
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 p-6 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">ยืนยันการลบข้อมูล</h3>
            <p className="text-slate-500 mb-6">
              คุณต้องการลบข้อมูลจำนวน {selectedIds.length} รายการใช่หรือไม่?
              {isTrashView ? ' ข้อมูลจะถูกลบถาวรและไม่สามารถกู้คืนได้' : ' ข้อมูลจะถูกย้ายไปที่ถังขยะ'}
            </p>
            <div className="flex justify-center gap-3">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="px-5 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition-colors flex-1"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleDeleteSelected}
                className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors shadow-md flex-1"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
