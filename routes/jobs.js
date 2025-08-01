const express = require('express');
const router = express.Router();
const supabase = require('../config/db');
const { verifyToken, isAdmin } = require('../middlewares/auth');

// Get all active jobs (public)
router.get('/', async (req, res) => {
  try {
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;
    res.json(jobs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Get job by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const { data: job, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', req.params.id)
      .eq('is_active', true)
      .single();

    if (error) throw error;
    if (!job) return res.status(404).json({ error: 'Job not found' });

    res.json(job);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// Admin routes
router.use(verifyToken, isAdmin);

// Create job
router.post('/', async (req, res) => {
  try {
    const { title, description, requirements, location, salary_range } = req.body;
    
    const { data: job, error } = await supabase
      .from('jobs')
      .insert([{ 
        title, 
        description, 
        requirements, 
        location, 
        salary_range,
        posted_by: req.user.id 
      }])
      .single();

    if (error) throw error;
    res.status(201).json(job);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// Update job
router.put('/:id', async (req, res) => {
  try {
    const { title, description, requirements, location, salary_range, is_active } = req.body;
    
    const { data: job, error } = await supabase
      .from('jobs')
      .update({ 
        title, 
        description, 
        requirements, 
        location, 
        salary_range,
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    res.json(job);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// Delete job
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

module.exports = router;