'use client';

import { useState } from 'react';
import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Step from '@mui/material/Step';
import Alert from '@mui/material/Alert';
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
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import RadioGroup from '@mui/material/RadioGroup';
import Radio from '@mui/material/Radio';
import FormLabel from '@mui/material/FormLabel';
import { alpha, useTheme } from '@mui/material/styles';

import { varFade, MotionViewport } from 'src/components/animate';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const REPORT_CATEGORIES = [
  { value: 'fraud', label: 'Financial Fraud', description: 'Misuse of public funds, embezzlement, or financial misconduct' },
  { value: 'corruption', label: 'Corruption', description: 'Bribery, kickbacks, or abuse of power for personal gain' },
  { value: 'waste', label: 'Government Waste', description: 'Inefficient use of taxpayer money or resources' },
  { value: 'ethics', label: 'Ethics Violations', description: 'Conflicts of interest, nepotism, or ethical misconduct' },
  { value: 'safety', label: 'Public Safety', description: 'Threats to public health, safety, or welfare' },
  { value: 'discrimination', label: 'Discrimination', description: 'Unfair treatment based on protected characteristics' },
  { value: 'retaliation', label: 'Retaliation', description: 'Punishment for previous whistleblowing or complaints' },
  { value: 'other', label: 'Other', description: 'Other forms of government misconduct or wrongdoing' },
];

const GOVERNMENT_LEVELS = [
  { value: 'federal', label: 'Federal Government' },
  { value: 'state', label: 'State Government' },
  { value: 'county', label: 'County Government' },
  { value: 'city', label: 'City/Municipal Government' },
  { value: 'school', label: 'School District' },
  { value: 'authority', label: 'Public Authority/Agency' },
];

const STEPS = ['Report Type', 'Details', 'Evidence', 'Contact', 'Review'];

export function WhistleblowerView() {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [reportData, setReportData] = useState({
    category: '',
    governmentLevel: '',
    agency: '',
    description: '',
    location: '',
    dateOccurred: '',
    witnesses: '',
    evidence: '',
    previousReports: false,
    previousReportsDetails: '',
    contactMethod: 'anonymous',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    followUp: false,
    protectionNeeded: false,
    urgency: 'medium',
  });

  const handleInputChange = (field: string) => (event: any) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setReportData({ ...reportData, [field]: value });
  };

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSubmit = () => {
    // In a real app, this would submit to a secure backend
    console.log('Whistleblower Report Submitted:', reportData);
    alert('Your report has been submitted securely. You will receive a confirmation number for tracking.');
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                What type of issue are you reporting?
              </Typography>
              <Grid container spacing={2}>
                {REPORT_CATEGORIES.map((category) => (
                  <Grid item xs={12} sm={6} key={category.value}>
                    <Card
                      sx={{
                        p: 2,
                        cursor: 'pointer',
                        border: reportData.category === category.value ? `2px solid ${theme.palette.primary.main}` : '1px solid transparent',
                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
                      }}
                      onClick={() => setReportData({ ...reportData, category: category.value })}
                    >
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        {category.label}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {category.description}
                      </Typography>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Government Level</InputLabel>
                <Select
                  value={reportData.governmentLevel}
                  onChange={handleInputChange('governmentLevel')}
                  label="Government Level"
                >
                  {GOVERNMENT_LEVELS.map((level) => (
                    <MenuItem key={level.value} value={level.value}>
                      {level.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Government Agency/Department"
                value={reportData.agency}
                onChange={handleInputChange('agency')}
                placeholder="e.g., Department of Transportation, City Planning Office"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={6}
                label="Detailed Description"
                value={reportData.description}
                onChange={handleInputChange('description')}
                placeholder="Please provide a detailed description of the misconduct, including who was involved, what happened, when it occurred, and any other relevant details..."
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Location"
                value={reportData.location}
                onChange={handleInputChange('location')}
                placeholder="Where did this occur?"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Date Occurred"
                value={reportData.dateOccurred}
                onChange={handleInputChange('dateOccurred')}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Witnesses (Optional)"
                value={reportData.witnesses}
                onChange={handleInputChange('witnesses')}
                placeholder="Names and contact information of any witnesses (if known and willing to be contacted)"
              />
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Evidence Description"
                value={reportData.evidence}
                onChange={handleInputChange('evidence')}
                placeholder="Describe any documents, emails, recordings, or other evidence you have. Do not upload sensitive files through this form."
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={reportData.previousReports}
                    onChange={handleInputChange('previousReports')}
                  />
                }
                label="Have you reported this issue before?"
              />
            </Grid>
            {reportData.previousReports && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Previous Reports Details"
                  value={reportData.previousReportsDetails}
                  onChange={handleInputChange('previousReportsDetails')}
                  placeholder="When and where did you report this previously? What was the response?"
                />
              </Grid>
            )}
            <Grid item xs={12}>
              <FormLabel component="legend">Urgency Level</FormLabel>
              <RadioGroup
                value={reportData.urgency}
                onChange={handleInputChange('urgency')}
                row
              >
                <FormControlLabel value="low" control={<Radio />} label="Low - Can wait for normal processing" />
                <FormControlLabel value="medium" control={<Radio />} label="Medium - Should be addressed soon" />
                <FormControlLabel value="high" control={<Radio />} label="High - Urgent attention needed" />
              </RadioGroup>
            </Grid>
          </Grid>
        );

      case 3:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Anonymous Reporting
                </Typography>
                You can submit this report completely anonymously. However, providing contact information 
                allows investigators to ask follow-up questions and keeps you informed of the investigation's progress.
              </Alert>
            </Grid>
            <Grid item xs={12}>
              <FormLabel component="legend">Contact Preference</FormLabel>
              <RadioGroup
                value={reportData.contactMethod}
                onChange={handleInputChange('contactMethod')}
              >
                <FormControlLabel 
                  value="anonymous" 
                  control={<Radio />} 
                  label="Anonymous - No contact information provided" 
                />
                <FormControlLabel 
                  value="confidential" 
                  control={<Radio />} 
                  label="Confidential - Provide contact info but keep identity protected" 
                />
                <FormControlLabel 
                  value="open" 
                  control={<Radio />} 
                  label="Open - Willing to be contacted directly" 
                />
              </RadioGroup>
            </Grid>
            {reportData.contactMethod !== 'anonymous' && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Name (Optional)"
                    value={reportData.contactName}
                    onChange={handleInputChange('contactName')}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Email (Optional)"
                    type="email"
                    value={reportData.contactEmail}
                    onChange={handleInputChange('contactEmail')}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Phone (Optional)"
                    value={reportData.contactPhone}
                    onChange={handleInputChange('contactPhone')}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={reportData.followUp}
                        onChange={handleInputChange('followUp')}
                      />
                    }
                    label="I want to receive updates on this report"
                  />
                </Grid>
              </>
            )}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={reportData.protectionNeeded}
                    onChange={handleInputChange('protectionNeeded')}
                  />
                }
                label="I am concerned about retaliation and may need whistleblower protection"
              />
            </Grid>
          </Grid>
        );

      case 4:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Review Your Report
              </Typography>
              <Card sx={{ p: 3, mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Report Category:</Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {REPORT_CATEGORIES.find(cat => cat.value === reportData.category)?.label}
                </Typography>
                
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Government Level:</Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {GOVERNMENT_LEVELS.find(level => level.value === reportData.governmentLevel)?.label}
                </Typography>
                
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Agency:</Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>{reportData.agency}</Typography>
                
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Description:</Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>{reportData.description}</Typography>
                
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Contact Method:</Typography>
                <Typography variant="body2">{reportData.contactMethod}</Typography>
              </Card>
              
              <Alert severity="warning" sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Important Legal Information
                </Typography>
                • Filing a false report is a crime<br/>
                • You are protected by whistleblower laws if reporting in good faith<br/>
                • This report will be forwarded to appropriate investigative authorities<br/>
                • Retaliation against whistleblowers is prohibited by law
              </Alert>
            </Grid>
          </Grid>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg">
      <MotionViewport>
        {/* Hero Section */}
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <m.div variants={varFade('inUp')}>
            <Typography variant="h2" sx={{ mb: 3 }}>
              Whistleblower Portal
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
              Report government misconduct, fraud, waste, or abuse safely and securely. 
              Your identity is protected, and retaliation is prohibited by law.
            </Typography>
          </m.div>
        </Box>

        {/* Protection Information */}
        <m.div variants={varFade('inUp')}>
          <Grid container spacing={3} sx={{ mb: 6 }}>
            <Grid item xs={12} md={4}>
              <Card sx={{ p: 3, textAlign: 'center', height: '100%' }}>
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    bgcolor: alpha(theme.palette.success.main, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  <Iconify icon="solar:shield-check-bold" width={32} sx={{ color: 'success.main' }} />
                </Box>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Legal Protection
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Virginia and federal laws protect whistleblowers from retaliation when reporting in good faith.
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ p: 3, textAlign: 'center', height: '100%' }}>
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    bgcolor: alpha(theme.palette.info.main, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  <Iconify icon="solar:eye-closed-bold" width={32} sx={{ color: 'info.main' }} />
                </Box>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Anonymous Reporting
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Submit reports completely anonymously or choose to provide contact information confidentially.
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ p: 3, textAlign: 'center', height: '100%' }}>
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    bgcolor: alpha(theme.palette.warning.main, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  <Iconify icon="solar:document-text-bold" width={32} sx={{ color: 'warning.main' }} />
                </Box>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Secure Processing
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Reports are securely transmitted to appropriate investigative authorities for proper handling.
                </Typography>
              </Card>
            </Grid>
          </Grid>
        </m.div>

        {/* Report Form */}
        <m.div variants={varFade('inUp')}>
          <Card sx={{ p: 4, mb: 6 }}>
            <Typography variant="h5" sx={{ mb: 3 }}>
              Submit a Report
            </Typography>
            
            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
              {STEPS.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {renderStepContent(activeStep)}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
              <Button
                disabled={activeStep === 0}
                onClick={handleBack}
                startIcon={<Iconify icon="solar:arrow-left-bold" />}
              >
                Back
              </Button>
              {activeStep === STEPS.length - 1 ? (
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  endIcon={<Iconify icon="solar:shield-check-bold" />}
                  color="success"
                >
                  Submit Report Securely
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
        </m.div>

        {/* Resources */}
        <m.div variants={varFade('inUp')}>
          <Card sx={{ p: 4, bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
            <Typography variant="h5" sx={{ mb: 3, textAlign: 'center' }}>
              Additional Resources
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Know Your Rights
                </Typography>
                <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.7 }}>
                  • Virginia Fraud and Abuse Whistle Blower Protection Act<br/>
                  • Federal Whistleblower Protection Act<br/>
                  • First Amendment protections for public employees<br/>
                  • Right to legal representation
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Iconify icon="solar:book-bold" />}
                  href="/downloads/whistleblower-rights-guide.pdf"
                >
                  Download Rights Guide
                </Button>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Get Help
                </Typography>
                <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.7 }}>
                  • Free legal consultation for whistleblowers<br/>
                  • Support groups and counseling resources<br/>
                  • Advocacy organizations<br/>
                  • Emergency assistance programs
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Iconify icon="solar:phone-bold" />}
                  href="/contact"
                >
                  Contact Support
                </Button>
              </Grid>
            </Grid>
          </Card>
        </m.div>
      </MotionViewport>
    </Container>
  );
}
