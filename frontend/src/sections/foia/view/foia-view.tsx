'use client';

import { useState, useEffect } from 'react';
import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Step from '@mui/material/Step';
import Button from '@mui/material/Button';
import Stepper from '@mui/material/Stepper';
import StepLabel from '@mui/material/StepLabel';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import { alpha, useTheme } from '@mui/material/styles';

import { varFade, MotionViewport } from 'src/components/animate';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const FOIA_TEMPLATES = [
  {
    title: 'Basic FOIA Request Letter',
    description: 'Standard template for requesting public records',
    format: 'PDF',
    icon: 'solar:document-text-bold',
    link: '/downloads/foia-basic-template.pdf',
    category: 'Templates',
  },
  {
    title: 'Budget Records Request',
    description: 'Specialized form for requesting budget and financial documents',
    format: 'DOCX',
    icon: 'solar:calculator-bold',
    link: '/downloads/budget-records-request.docx',
    category: 'Templates',
  },
  {
    title: 'Meeting Minutes Request',
    description: 'Template for requesting government meeting records and minutes',
    format: 'PDF',
    icon: 'solar:users-group-rounded-bold',
    link: '/downloads/meeting-minutes-request.pdf',
    category: 'Templates',
  },
  {
    title: 'Contract Information Request',
    description: 'Form for requesting government contract and vendor information',
    format: 'DOCX',
    icon: 'solar:document-add-bold',
    link: '/downloads/contract-info-request.docx',
    category: 'Templates',
  },
  {
    title: 'FOIA Appeals Guide',
    description: 'Step-by-step guide for appealing denied FOIA requests',
    format: 'PDF',
    icon: 'solar:book-bold',
    link: '/downloads/foia-appeals-guide.pdf',
    category: 'Guides',
  },
  {
    title: 'Virginia FOIA Law Summary',
    description: 'Complete overview of Virginia Freedom of Information Act',
    format: 'PDF',
    icon: 'solar:scale-bold',
    link: '/downloads/va-foia-law-summary.pdf',
    category: 'Guides',
  },
];

const FOIA_STEPS = [
  'Identify the records you need',
  'Choose the appropriate agency',
  'Submit your request',
  'Wait for response (5 business days)',
  'Review provided records',
];

const FAQ_DATA = [
  {
    question: 'What is the Virginia Freedom of Information Act?',
    answer: 'The Virginia Freedom of Information Act (FOIA) ensures that the people of Virginia have access to public records held by government agencies. It promotes transparency and accountability in government operations.',
  },
  {
    question: 'How long does it take to get a response?',
    answer: 'Government agencies must respond to FOIA requests within 5 business days. They can either provide the records, deny the request with explanation, or request additional time if the request is complex.',
  },
  {
    question: 'Are there any fees for FOIA requests?',
    answer: 'Agencies may charge reasonable fees for searching, reviewing, and copying records. The first hour of staff time is typically free, and copying costs are usually minimal (around $0.10 per page).',
  },
  {
    question: 'What if my request is denied?',
    answer: 'If your request is denied, you have the right to appeal. The agency must provide specific legal reasons for denial. You can appeal to the agency head or file a petition in circuit court.',
  },
  {
    question: 'What records are exempt from FOIA?',
    answer: 'Certain records are exempt, including personnel records, ongoing criminal investigations, attorney-client privileged communications, and records that would compromise security or privacy.',
  },
];

export function FoiaView() {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [formData, setFormData] = useState({
    requestType: '',
    agency: '',
    recordsDescription: '',
    timeframe: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    preferredFormat: 'electronic',
  });

  // Handle client-side hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleInputChange = (field: string) => (event: any) => {
    setFormData({ ...formData, [field]: event.target.value });
  };

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSubmit = () => {
    // In a real app, this would submit to a backend
    console.log('FOIA Request Submitted:', formData);
    alert('Your FOIA request has been prepared! Download the generated letter to submit to the appropriate agency.');
  };

  const renderTemplates = () => (
    <Grid container spacing={3}>
      {FOIA_TEMPLATES.map((template, index) => (
        <Grid item xs={12} sm={6} md={4} key={template.title}>
          <m.div variants={varFade('inUp', 0.1 * index)}>
            <Card 
              sx={{ 
                height: '100%', 
                transition: 'all 0.3s',
                '&:hover': { 
                  transform: 'translateY(-4px)',
                  boxShadow: theme.shadows[8]
                }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2,
                    }}
                  >
                    <Iconify icon={template.icon} width={24} sx={{ color: 'primary.main' }} />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                      {template.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {template.format} • {template.category}
                    </Typography>
                  </Box>
                </Box>

                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                  {template.description}
                </Typography>

                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Iconify icon="solar:download-bold" />}
                  href={template.link}
                >
                  Download
                </Button>
              </CardContent>
            </Card>
          </m.div>
        </Grid>
      ))}
    </Grid>
  );

  const renderRequestForm = () => (
    <Card sx={{ p: 4 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>
        FOIA Request Generator
      </Typography>
      
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {FOIA_STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {activeStep === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Type of Request</InputLabel>
              <Select
                value={formData.requestType}
                onChange={handleInputChange('requestType')}
                label="Type of Request"
              >
                <MenuItem value="budget">Budget & Financial Records</MenuItem>
                <MenuItem value="contracts">Contracts & Procurement</MenuItem>
                <MenuItem value="meetings">Meeting Minutes & Agendas</MenuItem>
                <MenuItem value="correspondence">Email & Correspondence</MenuItem>
                <MenuItem value="reports">Reports & Studies</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Describe the records you're seeking"
              value={formData.recordsDescription}
              onChange={handleInputChange('recordsDescription')}
              placeholder="Be as specific as possible about the records you need..."
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Time Frame"
              value={formData.timeframe}
              onChange={handleInputChange('timeframe')}
              placeholder="e.g., January 2023 - December 2023"
            />
          </Grid>
        </Grid>
      )}

      {activeStep === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Government Agency</InputLabel>
              <Select
                value={formData.agency}
                onChange={handleInputChange('agency')}
                label="Government Agency"
              >
                <MenuItem value="state-budget">Virginia Department of Budget & Planning</MenuItem>
                <MenuItem value="education">Virginia Department of Education</MenuItem>
                <MenuItem value="health">Virginia Department of Health</MenuItem>
                <MenuItem value="transportation">Virginia Department of Transportation</MenuItem>
                <MenuItem value="general-services">Virginia Department of General Services</MenuItem>
                <MenuItem value="local-city">Local City Government</MenuItem>
                <MenuItem value="local-county">Local County Government</MenuItem>
                <MenuItem value="other-agency">Other Agency</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      )}

      {activeStep === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Your Name"
              value={formData.contactName}
              onChange={handleInputChange('contactName')}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={formData.contactEmail}
              onChange={handleInputChange('contactEmail')}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Phone Number (Optional)"
              value={formData.contactPhone}
              onChange={handleInputChange('contactPhone')}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Preferred Format</InputLabel>
              <Select
                value={formData.preferredFormat}
                onChange={handleInputChange('preferredFormat')}
                label="Preferred Format"
              >
                <MenuItem value="electronic">Electronic (Email/Download)</MenuItem>
                <MenuItem value="paper">Paper Copies</MenuItem>
                <MenuItem value="inspection">Inspection Only</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button
          disabled={activeStep === 0}
          onClick={handleBack}
          startIcon={<Iconify icon="solar:arrow-left-bold" />}
        >
          Back
        </Button>
        {activeStep === FOIA_STEPS.length - 1 ? (
          <Button
            variant="contained"
            onClick={handleSubmit}
            endIcon={<Iconify icon="solar:document-add-bold" />}
          >
            Generate Request Letter
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleNext}
            endIcon={<Iconify icon="solar:arrow-right-bold" />}
          >
            Next
          </Button>
        )}
      </Box>
    </Card>
  );

  const renderFAQ = () => (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, textAlign: 'center' }}>
        Frequently Asked Questions
      </Typography>
      {FAQ_DATA.map((faq, index) => (
        <Accordion key={index} sx={{ mb: 1 }}>
          <AccordionSummary expandIcon={<Iconify icon="solar:alt-arrow-down-bold" />}>
            <Typography variant="subtitle1">{faq.question}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {faq.answer}
            </Typography>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );

  // Prevent hydration mismatch by rendering static content on server
  if (!isClient) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h2" sx={{ mb: 3 }}>
            Freedom of Information Toolkit
          </Typography>
          <Typography
            variant="h5"
            sx={{
              color: 'text.secondary',
              maxWidth: 800,
              mx: 'auto',
              lineHeight: 1.6,
              mb: 4,
            }}
          >
            Virginia's Freedom of Information Act ensures your right to access government records.
            Use these tools to request public documents, understand the process, and hold your
            government accountable.
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <MotionViewport>
        {/* Hero Section */}
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <m.div variants={varFade('inUp')}>
            <Typography variant="h2" sx={{ mb: 3 }}>
              Freedom of Information Toolkit
            </Typography>
          </m.div>

          <m.div variants={varFade('inUp')}>
            <Typography
              variant="h5"
              sx={{
                color: 'text.secondary',
                maxWidth: 800,
                mx: 'auto',
                lineHeight: 1.6,
                mb: 4,
              }}
            >
              Virginia's Freedom of Information Act ensures your right to access government records.
              Use these tools to request public documents, understand the process, and hold your
              government accountable.
            </Typography>
          </m.div>
        </Box>

        {/* Templates Section */}
        <m.div variants={varFade('inUp')}>
          <Typography variant="h4" sx={{ mb: 4, textAlign: 'center' }}>
            FOIA Templates & Resources
          </Typography>
          {renderTemplates()}
        </m.div>

        {/* Request Form Section */}
        <m.div variants={varFade('inUp')}>
          <Box sx={{ mt: 8, mb: 8 }}>
            {renderRequestForm()}
          </Box>
        </m.div>

        {/* FAQ Section */}
        <m.div variants={varFade('inUp')}>
          <Box sx={{ mb: 8 }}>
            {renderFAQ()}
          </Box>
        </m.div>

        {/* Contact Section */}
        <m.div variants={varFade('inUp')}>
          <Card sx={{ p: 4, textAlign: 'center', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
            <Typography variant="h5" sx={{ mb: 2 }}>
              Need Help with Your FOIA Request?
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
              Our team can help you navigate the FOIA process and ensure your request is properly formatted.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<Iconify icon="solar:chat-round-bold" />}
                href="/contact"
              >
                Contact Support
              </Button>
              <Button
                variant="outlined"
                startIcon={<Iconify icon="solar:book-bold" />}
                href="/downloads/foia-complete-guide.pdf"
              >
                Download Complete Guide
              </Button>
            </Box>
          </Card>
        </m.div>
      </MotionViewport>
    </Container>
  );
}
