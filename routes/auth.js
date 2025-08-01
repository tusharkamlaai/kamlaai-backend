const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const supabase = require('../config/db');
const { verifyToken } = require('../middlewares/auth');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Google login
router.post('/google', async (req, res) => {
  try {
    const { token } = req.body;
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const { name, email, sub: googleId } = payload;

    // Check if user exists
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError && userError.code !== 'PGRST116') { // PGRST116 = no rows found
      throw userError;
    }

    // If user doesn't exist, create them
    if (!user) {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{ 
          name, 
          email, 
          google_id: googleId 
        }])
        .select('*') // Important: return the created record
        .single();

      if (createError) throw createError;
      user = newUser;
    }

    // Now we're sure user exists
    const jwtToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({ token: jwtToken, user });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(500).json({ 
      error: 'Authentication failed',
      details: error.message 
    });
  }
});
// Email/password login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // For demo, we're using a simple check for admin
    if (email === 'admin@example.com' && password === 'admin@123') {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) throw error;

      const jwtToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
      return res.json({ token: jwtToken, user });
    }

    res.status(401).json({ error: 'Invalid credentials' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', verifyToken, async (req, res) => {
  try {
    res.json(req.user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

module.exports = router;