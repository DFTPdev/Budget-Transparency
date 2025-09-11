'use client';

import { useState } from 'react';
import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';

import { varFade } from 'src/components/animate';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const INQUIRY_TYPES = [
  { value: 'foia', label: 'FOIA Request Assistance' },
  { value: 'budget', label: 'Budget Data Questions' },
  { value: 'whistleblower', label: 'Whistleblower Support' },
  { value: 'technical', label: 'Technical Support' },
  { value: 'media', label: 'Media Inquiry' },
  { value: 'partnership', label: 'Partnership Opportunity' },
  { value: 'general', label: 'General Question' },
];

export function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    inquiryType: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleInputChange = (field: string) => (event: any) => {
    setFormData({ ...formData, [field]: event.target.value });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    // In a real app, this would submit to a backend
    console.log('Contact form submitted:', formData);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <m.div variants={varFade('inUp')}>
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: 'success.lighter',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
            }}
          >
            <Iconify icon="solar:check-circle-bold" width={40} sx={{ color: 'success.main' }} />
          </Box>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Message Sent Successfully!
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
            Thank you for contacting DFTP. We'll get back to you within 24 hours.
          </Typography>
          <Button
            variant="outlined"
            onClick={() => setSubmitted(false)}
            startIcon={<Iconify icon="solar:arrow-left-bold" />}
          >
            Send Another Message
          </Button>
        </Card>
      </m.div>
    );
  }

  return (
    <m.div variants={varFade('inUp')}>
      <Typography variant="h3" sx={{ mb: 5 }}>
        Send us a message
      </Typography>

      <Box component="form" onSubmit={handleSubmit}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            fullWidth
            label="Full Name"
            value={formData.name}
            onChange={handleInputChange('name')}
            required
          />

          <TextField
            fullWidth
            type="email"
            label="Email Address"
            value={formData.email}
            onChange={handleInputChange('email')}
            required
          />

          <TextField
            fullWidth
            label="Phone Number (Optional)"
            value={formData.phone}
            onChange={handleInputChange('phone')}
          />

          <FormControl fullWidth required>
            <InputLabel>Type of Inquiry</InputLabel>
            <Select
              value={formData.inquiryType}
              onChange={handleInputChange('inquiryType')}
              label="Type of Inquiry"
            >
              {INQUIRY_TYPES.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Subject"
            value={formData.subject}
            onChange={handleInputChange('subject')}
            required
          />

          <TextField
            fullWidth
            multiline
            rows={6}
            label="Message"
            value={formData.message}
            onChange={handleInputChange('message')}
            placeholder="Please provide details about your inquiry. For FOIA requests, include the type of records you're seeking and relevant timeframes."
            required
          />

          {formData.inquiryType === 'whistleblower' && (
            <Alert severity="info">
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Whistleblower Inquiries
              </Typography>
              For anonymous reporting, please use our dedicated{' '}
              <a href="/whistleblower" style={{ color: 'inherit', textDecoration: 'underline' }}>
                Whistleblower Portal
              </a>
              . This contact form is for general support questions only.
            </Alert>
          )}

          <Button
            type="submit"
            variant="contained"
            size="large"
            endIcon={<Iconify icon="solar:arrow-right-bold" />}
            sx={{ alignSelf: 'flex-start' }}
          >
            Send Message
          </Button>
        </Box>
      </Box>
    </m.div>
  );
}
