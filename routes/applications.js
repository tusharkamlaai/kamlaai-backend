const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const supabase = require('../config/db');
const { verifyToken } = require('../middlewares/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'resume-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Apply for job
// In routes/applications.js
router.post('/', upload.single('resume'), async (req, res) => {
  try {
    const { 
      jobId,
      name,
      email,
      phone,
      expected_salary,
      cover_letter,
      location,
      city,
      education,
      position_applying
    } = req.body;

    // Validate required fields
    if (!req.file) {
      return res.status(400).json({ error: 'Resume is required' });
    }

    // Check if user already applied to this job
    const { data: existingApplication, error: checkError } = await supabase
      .from('applications')
      .select('id')
      .eq('job_id', jobId)
      .eq('user_id', req.user.id)
      .single();

    if (existingApplication) {
      return res.status(400).json({ 
        error: 'You have already applied to this job position',
        application_id: existingApplication.id
      });
    }

    const resumeUrl = `${req.protocol}://${req.get('host')}/${req.file.filename}`;

    const { data: application, error } = await supabase
      .from('applications')
      .insert([{
        job_id: jobId,
        user_id: req.user.id,
        name,
        email,
        phone,
        expected_salary,
        cover_letter,
        location,
        city,
        education,
        position_applying,
        resume_url: resumeUrl,
        status: 'pending'
      }])
      .select('*')
      .single();

    if (error) throw error;
    
    res.status(201).json({
      message: 'Application submitted successfully',
      application
    });
  } catch (error) {
    console.error('Application Error:', error);
    res.status(500).json({ 
      error: 'Failed to submit application',
      details: error.message 
    });
  }
});

// Get user's applications
router.get('/my-applications', async (req, res) => {
  try {
    const { data: applications, error } = await supabase
      .from('applications')
      .select('*, jobs(*)')
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json(applications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

module.exports = router;