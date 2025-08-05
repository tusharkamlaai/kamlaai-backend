const express = require('express');
const router = express.Router();
const supabase = require('../config/db');
const { verifyToken, isAdmin } = require('../middlewares/auth');

// Admin middleware
router.use(verifyToken, isAdmin);

// Get all users
router.get('/users', async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*');

    if (error) throw error;
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get all applications
router.get('/applications', async (req, res) => {
  try {
    const { data: applications, error } = await supabase
      .from('applications')
      .select('*, users(*), jobs(*)');

    if (error) throw error;
    res.json(applications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Get application statistics
router.get('/stats', async (req, res) => {
  try {
    // Total users
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Total applications
    const { count: totalApplications } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true });

    // Applications per job
    const { data: applicationsPerJob } = await supabase
      .from('jobs')
      .select('id, title, applications(count)');

    res.json({
      totalUsers,
      totalApplications,
      applicationsPerJob
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});


router.patch('/applications/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'reviewed', 'approved', 'rejected'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: "Invalid status",
        valid_statuses: validStatuses
      });
    }

    // Simplified update without updated_at
    const { data, error } = await supabase
      .from('applications')
      .update({ status })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) throw error;
    
    res.json({
      success: true,
      application: data
    });

  } catch (error) {
    console.error('Admin Update Error:', error);
    res.status(500).json({
      error: "Failed to update application",
      details: error.message,
      code: error.code // Include error code in response
    });
  }
});


module.exports = router;