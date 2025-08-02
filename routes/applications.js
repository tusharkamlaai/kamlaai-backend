const express = require('express');
const multer = require('multer');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// UUID validation helper
function isValidUUID(uuid) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
}

// Memory storage for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Submit application
router.post('/', upload.single('resume'), async (req, res) => {
  try {
    // Validate required fields
    if (!req.file) {
      return res.status(400).json({ error: "Resume file is required" });
    }

    if (!req.body.jobId || !isValidUUID(req.body.jobId)) {
      return res.status(400).json({ error: "Valid job ID is required" });
    }

    // Upload resume to Supabase Storage
    const fileName = `resume-${Date.now()}-${req.user.id}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(fileName, req.file.buffer, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('resumes')
      .getPublicUrl(fileName);

    // Save application to database
    const { data, error: dbError } = await supabase
      .from('applications')
      .insert([{
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
        resume_url: publicUrl
      }])
      .select();

    if (dbError) throw dbError;

    res.status(201).json(data[0]);

  } catch (error) {
    console.error('Application Error:', error);
    res.status(500).json({ 
      error: "Failed to submit application",
      details: error.message 
    });
  }
});

// Get user's applications
router.get('/my-applications', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('applications')
      .select(`
        id,
        status,
        applied_at,
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
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;