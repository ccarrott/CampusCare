import * as AdminCrud from '../models/adminCrudModel.js';
import { sanitize, isValidStudentNumber, isValidEmail, isValidPassword } from '../middlewares/validation.js';

// ============================================================================
// ADMIN CRUD CONTROLLER - Student & Nurse Management
// ============================================================================

// --- STUDENTS ---

export async function listStudents(req, res) {
  try {
    const search = req.query.search || '';
    const students = search
      ? await AdminCrud.searchStudents(search)
      : await AdminCrud.getAllStudents();

    res.render('admin/students', {
      user: req.session.user,
      students,
      search,
      error: null,
      success: req.query.success || null
    });
  } catch (error) {
    console.error('List students error:', error);
    res.status(500).render('admin/students', {
      user: req.session.user,
      students: [],
      search: '',
      error: 'Failed to load students.',
      success: null
    });
  }
}

export async function showAddStudentForm(req, res) {
  res.render('admin/student-form', {
    user: req.session.user,
    student: null,
    isEdit: false,
    error: null
  });
}

export async function showEditStudentForm(req, res) {
  try {
    const student = await AdminCrud.getStudentById(req.params.id);
    if (!student) {
      return res.redirect('/management/admin/students');
    }
    res.render('admin/student-form', {
      user: req.session.user,
      student,
      isEdit: true,
      error: null
    });
  } catch (error) {
    console.error('Edit student form error:', error);
    res.redirect('/management/admin/students');
  }
}

export async function handleAddStudent(req, res) {
  try {
    const studentNumber = sanitize(req.body.studentNumber);
    const firstName = sanitize(req.body.firstName);
    const lastName = sanitize(req.body.lastName);
    const email = sanitize(req.body.email);
    const address = sanitize(req.body.address);
    const medicalHistory = sanitize(req.body.medicalHistory);
    const password = req.body.password || '';

    if (!studentNumber || !firstName || !lastName || !password) {
      return res.render('admin/student-form', {
        user: req.session.user,
        student: req.body,
        isEdit: false,
        error: 'Student Number, Name, and Password are required.'
      });
    }

    if (!isValidStudentNumber(studentNumber)) {
      return res.render('admin/student-form', {
        user: req.session.user,
        student: req.body,
        isEdit: false,
        error: 'Student Number must start with "s" followed by 9 digits.'
      });
    }

    if (!isValidEmail(email)) {
      return res.render('admin/student-form', {
        user: req.session.user,
        student: req.body,
        isEdit: false,
        error: 'Invalid email format.'
      });
    }

    if (!isValidPassword(password)) {
      return res.render('admin/student-form', {
        user: req.session.user,
        student: req.body,
        isEdit: false,
        error: 'Password must be at least 6 characters.'
      });
    }

    // Check duplicate
    const existing = await AdminCrud.getStudentById(studentNumber);
    if (existing) {
      return res.render('admin/student-form', {
        user: req.session.user,
        student: req.body,
        isEdit: false,
        error: 'A student with this number already exists.'
      });
    }

    await AdminCrud.createStudent({ studentNumber, firstName, lastName, email, address, medicalHistory, password });
    res.redirect('/management/admin/students?success=Student added successfully.');
  } catch (error) {
    console.error('Add student error:', error);
    res.render('admin/student-form', {
      user: req.session.user,
      student: req.body,
      isEdit: false,
      error: 'Failed to add student: ' + error.message
    });
  }
}

export async function handleUpdateStudent(req, res) {
  try {
    const { firstName, lastName, email, address, medicalHistory } = req.body;
    await AdminCrud.updateStudent(req.params.id, { firstName, lastName, email, address, medicalHistory });
    res.redirect('/management/admin/students?success=Student updated.');
  } catch (error) {
    console.error('Update student error:', error);
    const student = await AdminCrud.getStudentById(req.params.id);
    res.render('admin/student-form', {
      user: req.session.user,
      student,
      isEdit: true,
      error: 'Failed to update: ' + error.message
    });
  }
}

export async function handleDeleteStudent(req, res) {
  try {
    await AdminCrud.deleteStudent(req.params.id);
    res.redirect('/management/admin/students?success=Student deleted.');
  } catch (error) {
    console.error('Delete student error:', error);
    res.redirect('/management/admin/students?success=&error=' + encodeURIComponent(error.message));
  }
}

// --- NURSES ---

export async function listNurses(req, res) {
  try {
    const nurses = await AdminCrud.getAllNurses();
    const clinics = await AdminCrud.getAllClinics();

    res.render('admin/nurses', {
      user: req.session.user,
      nurses,
      clinics,
      error: null,
      success: req.query.success || null
    });
  } catch (error) {
    console.error('List nurses error:', error);
    res.status(500).render('admin/nurses', {
      user: req.session.user,
      nurses: [],
      clinics: [],
      error: 'Failed to load nurses.',
      success: null
    });
  }
}

export async function showAddNurseForm(req, res) {
  const clinics = await AdminCrud.getAllClinics();
  res.render('admin/nurse-form', {
    user: req.session.user,
    nurse: null,
    clinics,
    isEdit: false,
    error: null
  });
}

export async function showEditNurseForm(req, res) {
  try {
    const nurse = await AdminCrud.getNurseById(req.params.id);
    const clinics = await AdminCrud.getAllClinics();
    if (!nurse) {
      return res.redirect('/management/admin/nurses');
    }
    res.render('admin/nurse-form', {
      user: req.session.user,
      nurse,
      clinics,
      isEdit: true,
      error: null
    });
  } catch (error) {
    console.error('Edit nurse form error:', error);
    res.redirect('/management/admin/nurses');
  }
}

export async function handleAddNurse(req, res) {
  try {
    const staffNumber = sanitize(req.body.staffNumber);
    const firstName = sanitize(req.body.firstName);
    const lastName = sanitize(req.body.lastName);
    const email = sanitize(req.body.email);
    const phoneNumber = sanitize(req.body.phoneNumber);
    const address = sanitize(req.body.address);
    const clinicId = sanitize(req.body.clinicId);
    const password = req.body.password || '';

    if (!staffNumber || !firstName || !lastName || !password) {
      const clinics = await AdminCrud.getAllClinics();
      return res.render('admin/nurse-form', {
        user: req.session.user,
        nurse: req.body,
        clinics,
        isEdit: false,
        error: 'Staff Number, Name, and Password are required.'
      });
    }

    if (!isValidEmail(email)) {
      const clinics = await AdminCrud.getAllClinics();
      return res.render('admin/nurse-form', {
        user: req.session.user,
        nurse: req.body,
        clinics,
        isEdit: false,
        error: 'Invalid email format.'
      });
    }

    if (!isValidPassword(password)) {
      const clinics = await AdminCrud.getAllClinics();
      return res.render('admin/nurse-form', {
        user: req.session.user,
        nurse: req.body,
        clinics,
        isEdit: false,
        error: 'Password must be at least 6 characters.'
      });
    }

    const existing = await AdminCrud.getNurseById(staffNumber);
    if (existing) {
      const clinics = await AdminCrud.getAllClinics();
      return res.render('admin/nurse-form', {
        user: req.session.user,
        nurse: req.body,
        clinics,
        isEdit: false,
        error: 'A nurse with this Staff Number already exists.'
      });
    }

    await AdminCrud.createNurse({ staffNumber, firstName, lastName, email, phoneNumber, address, clinicId, password });
    res.redirect('/management/admin/nurses?success=Nurse added successfully.');
  } catch (error) {
    console.error('Add nurse error:', error);
    const clinics = await AdminCrud.getAllClinics();
    res.render('admin/nurse-form', {
      user: req.session.user,
      nurse: req.body,
      clinics,
      isEdit: false,
      error: 'Failed to add nurse: ' + error.message
    });
  }
}

export async function handleUpdateNurse(req, res) {
  try {
    const { firstName, lastName, email, phoneNumber, address, clinicId } = req.body;
    await AdminCrud.updateNurse(req.params.id, { firstName, lastName, email, phoneNumber, address, clinicId });
    res.redirect('/management/admin/nurses?success=Nurse updated.');
  } catch (error) {
    console.error('Update nurse error:', error);
    res.redirect('/management/admin/nurses');
  }
}

export async function handleDeleteNurse(req, res) {
  try {
    await AdminCrud.deleteNurse(req.params.id);
    res.redirect('/management/admin/nurses?success=Nurse removed.');
  } catch (error) {
    console.error('Delete nurse error:', error);
    res.redirect('/management/admin/nurses?success=&error=' + encodeURIComponent(error.message));
  }
}
