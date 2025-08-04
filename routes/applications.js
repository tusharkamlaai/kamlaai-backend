const express = require('express');
const multer = require('multer');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Configure memory storage for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Helper function to validate UUIDs
function isValidUUID(uuid) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
}

// Submit job application
router.post('/', upload.single('resume'), async (req, res) => {
  try {
    // 1. Validate required fields
    if (!req.file) {
      return res.status(400).json({ error: "Resume PDF is required" });
    }

    if (!req.body.jobId || !isValidUUID(req.body.jobId)) {
      return res.status(400).json({ error: "Valid job ID is required" });
    }

    // 2. Check for existing application
    const { data: existingApp, error: checkError } = await supabase
      .from('applications')
      .select('id, resume_url')
      .eq('job_id', req.body.jobId)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (checkError) throw checkError;
    if (existingApp) {
      return res.status(409).json({ 
        error: "You've already applied to this position",
        existing_resume_url: existingApp.resume_url 
      });
    }

    // 3. Upload resume to Supabase Storage
    const fileName = `resume-${Date.now()}-${req.user.id}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(fileName, req.file.buffer, {
        contentType: 'application/pdf',
        cacheControl: '3600' // Cache for 1 hour
      });

    if (uploadError) throw uploadError;

    // 4. Generate public download URL
    const { data: { publicUrl } } = supabase.storage
      .from('resumes')
      .getPublicUrl(fileName);

    // 5. Save application to database
    const { data: application, error: dbError } = await supabase
      .from('applications')
      .insert({
        job_id: req.body.jobId,
        user_id: req.user.id,
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        expected_salary: req.body.expected_salary,
        cover_letter: req.body.cover_letter,
        location: req.body.location,
        city: req.body.city,
        education: req.body.education,
        position_applying: req.body.position_applying,
        resume_url: publicUrl // Store full public URL
      })
      .select('*')
      .single();

    if (dbError) {
      // Handle unique constraint violation (secondary check)
      if (dbError.code === '23505') {
        return res.status(409).json({ 
          error: "Application already exists",
          details: "Duplicate detected by database constraint"
        });
      }
      throw dbError;
    }

    // 6. Return complete application data
    res.status(201).json({
      ...application,
      resume_download_url: publicUrl // Explicit URL for frontend
    });

  } catch (error) {
    console.error('Application Error:', error);
    res.status(500).json({ 
      error: "Failed to submit application",
      details: error.message,
      code: error.code 
    });
  }
});

// Get user's applications
router.get('/my-applications', async (req, res) => {
  try {
    const { data: applications, error } = await supabase
      .from('applications')
      .select(`
        id,
        status,
        applied_at,
        resume_url,
        jobs (
          id,
          title,
          company,
          location
        )
      `)
      .eq('user_id', req.user.id)
      .order('applied_at', { ascending: false });

    if (error) throw error;

    // Enhance with download URLs
    const enhancedApps = applications.map(app => ({
      ...app,
      resume_download_url: app.resume_url // Already full URL
    }));

    res.json(enhancedApps);
  } catch (error) {
    res.status(500).json({ 
      error: "Failed to fetch applications",
      details: error.message 
    });
  }
});

module.exports = router;