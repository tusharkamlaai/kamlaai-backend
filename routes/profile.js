const express = require('express');
const router = express.Router();
const supabase = require('../config/db');
const { verifyToken } = require('../middlewares/auth');

// Get user profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    // Get user basic info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        google_id,
        created_at,
        updated_at,
        is_admin
      `)
      .eq('id', req.user.id)
      .single();

    if (userError) throw userError;
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Get user's applications with job details
    const { data: applications, error: appsError } = await supabase
      .from('applications')
      .select(`
        id,
        applied_at,
        status,
        jobs (
          id,
          title,
          description,
          requirements,
          location,
          salary_range,
          is_active,
          created_at
        )
      `)
      .eq('user_id', req.user.id)
      .order('applied_at', { ascending: false });

    if (appsError) throw appsError;

    // Format response
    const profileData = {
      user: {
        ...user,
        profile_picture: user.google_id 
          ? `https://lh3.googleusercontent.com/a/${user.google_id}=s96-c`
          : null
      },
      applications: applications.map(app => ({
        application_id: app.id,
        applied_at: app.applied_at,
        status: app.status,
        job: app.jobs
      })),
      stats: {
        total_applications: applications.length,
        pending: applications.filter(a => a.status === 'pending').length,
        reviewed: applications.filter(a => a.status === 'reviewed').length,
        rejected: applications.filter(a => a.status === 'rejected').length
      }
    };

    res.json(profileData);
  } catch (error) {
    console.error('Profile Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch profile',
      details: error.message 
    });
  }
});

// Update user profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { name } = req.body;

    const { data: user, error } = await supabase
      .from('users')
      .update({ 
        name,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.id)
      .select(`
        id,
        name,
        email,
        google_id,
        created_at,
        updated_at
      `)
      .single();

    if (error) throw error;

    res.json({
      ...user,
      profile_picture: user.google_id 
        ? `https://lh3.googleusercontent.com/a/${user.google_id}=s96-c`
        : null
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;