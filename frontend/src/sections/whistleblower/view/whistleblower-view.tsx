'use client';

import { z as zod } from 'zod';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import { alpha, useTheme } from '@mui/material/styles';

import { varFade, MotionViewport } from 'src/components/animate';
import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';

// ----------------------------------------------------------------------

const REPORT_CATEGORIES = [
  {
    value: 'fraud',
    label: 'Financial Fraud',
    description: 'Misuse of public funds, embezzlement, or financial misconduct',
    icon: 'solar:dollar-bold',
  },
  {
    value: 'corruption',
    label: 'Corruption',
    description: 'Bribery, kickbacks, or abuse of power for personal gain',
    icon: 'solar:hand-money-bold',
  },
  {
    value: 'waste',
    label: 'Government Waste',
    description: 'Inefficient use of taxpayer money or resources',
    icon: 'solar:trash-bin-trash-bold',
  },
  {
    value: 'ethics',
    label: 'Ethics Violations',
    description: 'Conflicts of interest, nepotism, or ethical misconduct',
    icon: 'solar:scale-bold',
  },
  {
    value: 'safety',
    label: 'Public Safety',
    description: 'Threats to public health, safety, or welfare',
    icon: 'solar:danger-bold',
  },
  {
    value: 'discrimination',
    label: 'Discrimination',
    description: 'Unfair treatment based on protected characteristics',
    icon: 'solar:users-group-rounded-bold',
  },
  {
    value: 'retaliation',
    label: 'Retaliation',
    description: 'Punishment for previous whistleblowing or complaints',
    icon: 'solar:shield-warning-bold',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Other forms of government misconduct or wrongdoing',
    icon: 'solar:document-bold',
  },
];

const GOVERNMENT_LEVELS = [
  { value: 'federal', label: 'Federal Government', icon: 'solar:flag-bold' },
  { value: 'state', label: 'State Government', icon: 'solar:city-bold' },
  { value: 'county', label: 'County Government', icon: 'solar:map-bold' },
  { value: 'city', label: 'City/Municipal Government', icon: 'solar:buildings-bold' },
  { value: 'school', label: 'School District', icon: 'solar:book-bold' },
  { value: 'authority', label: 'Public Authority/Agency', icon: 'solar:document-text-bold' },
];

// ----------------------------------------------------------------------
// Form Schema

const WhistleblowerSchema = zod.object({
  category: zod.string().min(1, 'Please select a report category'),
  governmentLevel: zod.string().min(1, 'Please select a government level'),
  agency: zod.string().min(1, 'Agency/Department is required'),
  description: zod
    .string()
    .min(100, 'Please provide more detail (at least 100 characters)')
    .max(2000, 'Description is too long (maximum 2000 characters)'),
  location: zod.string().optional(),
  dateOccurred: zod.date().nullable(),
  witnesses: zod.string().optional(),
  evidence: zod.string().optional(),
  previousReports: zod.boolean(),
  previousReportsDetails: zod.string().optional(),
  contactMethod: zod.enum(['anonymous', 'confidential', 'open']),
  contactName: zod.string().optional(),
  contactEmail: zod.string().email('Please enter a valid email address').optional().or(zod.literal('')),
  contactPhone: zod.string().optional(),
  followUp: zod.boolean(),
  protectionNeeded: zod.boolean(),
  urgency: zod.enum(['low', 'medium', 'high']),
});

type WhistleblowerSchemaType = zod.infer<typeof WhistleblowerSchema>;

const defaultValues: WhistleblowerSchemaType = {
  category: '',
  governmentLevel: '',
  agency: '',
  description: '',
  location: '',
  dateOccurred: null,
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
};

export function WhistleblowerView() {
  const theme = useTheme();
  const [isClient, setIsClient] = useState(false);

  const methods = useForm<WhistleblowerSchemaType>({
    resolver: zodResolver(WhistleblowerSchema),
    defaultValues,
    mode: 'onChange',
  });

  const {
    handleSubmit,
    watch,
    reset,
    formState: { isSubmitting },
  } = methods;

  // Handle client-side hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  const onSubmit = handleSubmit(async (data) => {
    try {
      // In a real app, this would submit to a secure backend
      console.log('Whistleblower Report Submitted:', data);
      alert('Your report has been submitted securely. You will receive a confirmation number for tracking.');
    } catch (error) {
      console.error('Error submitting report:', error);
    }
  });

  // Watch form values for character counter
  const description = watch('description');
  const descriptionLength = description?.length || 0;
  const contactMethod = watch('contactMethod');
  const previousReports = watch('previousReports');

  const renderReportForm = () => (
    <Form methods={methods} onSubmit={onSubmit}>
      <Card sx={{ p: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.error.main, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mr: 2,
            }}
          >
            <Iconify icon="solar:shield-warning-bold" width={32} sx={{ color: 'error.main' }} />
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h5">Submit a Confidential Report</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              All fields are required unless marked optional
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 4 }} />

        {/* Section 1: Report Type */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
            <Iconify icon="solar:danger-bold" width={24} sx={{ mr: 1 }} />
            What Are You Reporting?
          </Typography>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <Field.Autocomplete
                name="category"
                label="Report Category"
                placeholder="Select the type of misconduct..."
                options={REPORT_CATEGORIES}
                getOptionLabel={(option) => (typeof option === 'string' ? option : option.label)}
                renderOption={(props, option) => {
                  const { key, ...otherProps } = props;
                  return (
                    <Box component="li" key={option.value} {...otherProps}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 1,
                          bgcolor: alpha(theme.palette.error.main, 0.1),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 2,
                          flexShrink: 0,
                        }}
                      >
                        <Iconify icon={option.icon} width={20} sx={{ color: 'error.main' }} />
                      </Box>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2">{option.label}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {option.description}
                        </Typography>
                      </Box>
                    </Box>
                  );
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Field.Autocomplete
                name="governmentLevel"
                label="Government Level"
                placeholder="Select government level..."
                options={GOVERNMENT_LEVELS}
                getOptionLabel={(option) => (typeof option === 'string' ? option : option.label)}
                renderOption={(props, option) => {
                  const { key, ...otherProps } = props;
                  return (
                    <Box component="li" key={option.value} {...otherProps}>
                      <Iconify icon={option.icon} width={20} sx={{ mr: 2, color: 'text.secondary' }} />
                      <Typography variant="body2">{option.label}</Typography>
                    </Box>
                  );
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Field.Text
                name="agency"
                label="Agency/Department"
                placeholder="e.g., Department of Transportation"
              />
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ mb: 4 }} />

        {/* Section 2: Details */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
            <Iconify icon="solar:document-text-bold" width={24} sx={{ mr: 1 }} />
            Incident Details
          </Typography>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <Field.Text
                name="description"
                label="Detailed Description"
                placeholder="Provide a detailed description including who was involved, what happened, when it occurred, and any other relevant details..."
                multiline
                rows={6}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color:
                      descriptionLength < 100
                        ? 'error.main'
                        : descriptionLength < 200
                          ? 'warning.main'
                          : 'success.main',
                  }}
                >
                  {descriptionLength}/2000 characters
                  {descriptionLength < 100 && ' (minimum 100)'}
                </Typography>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Field.Text
                name="location"
                label="Location (Optional)"
                placeholder="Where did this occur?"
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Field.DatePicker name="dateOccurred" label="Date Occurred (Optional)" />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Field.Text
                name="witnesses"
                label="Witnesses (Optional)"
                placeholder="Names and contact information of any witnesses..."
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ mb: 4 }} />

        {/* Section 3: Evidence & Urgency */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
            <Iconify icon="solar:folder-with-files-bold" width={24} sx={{ mr: 1 }} />
            Evidence & Additional Information
          </Typography>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <Field.Text
                name="evidence"
                label="Evidence Description (Optional)"
                placeholder="Describe any documents, emails, recordings, or other evidence you have. Do not upload sensitive files through this form."
                multiline
                rows={3}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Field.Checkbox
                name="previousReports"
                label="I have reported this issue before"
              />
            </Grid>

            {previousReports && (
              <Grid size={{ xs: 12 }}>
                <Field.Text
                  name="previousReportsDetails"
                  label="Previous Reports Details"
                  placeholder="When and where did you report this previously? What was the response?"
                  multiline
                  rows={3}
                />
              </Grid>
            )}

            <Grid size={{ xs: 12 }}>
              <Field.RadioGroup
                name="urgency"
                label="Urgency Level"
                options={[
                  { value: 'low', label: 'Low - Can wait for normal processing' },
                  { value: 'medium', label: 'Medium - Should be addressed soon' },
                  { value: 'high', label: 'High - Urgent attention needed' },
                ]}
              />
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ mb: 4 }} />

        {/* Section 4: Contact Information */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
            <Iconify icon="solar:user-bold" width={24} sx={{ mr: 1 }} />
            Contact Preference
          </Typography>

          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Anonymous Reporting Available
            </Typography>
            You can submit this report completely anonymously. However, providing contact
            information allows investigators to ask follow-up questions and keeps you informed of
            progress.
          </Alert>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <Field.RadioGroup
                name="contactMethod"
                label="How would you like to be contacted?"
                options={[
                  { value: 'anonymous', label: 'Anonymous - No contact information provided' },
                  {
                    value: 'confidential',
                    label: 'Confidential - Provide contact info but keep identity protected',
                  },
                  { value: 'open', label: 'Open - Willing to be contacted directly' },
                ]}
              />
            </Grid>

            {contactMethod !== 'anonymous' && (
              <>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Field.Text name="contactName" label="Name (Optional)" />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Field.Text name="contactEmail" label="Email (Optional)" type="email" />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Field.Phone name="contactPhone" label="Phone (Optional)" />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Field.Checkbox
                    name="followUp"
                    label="I want to receive updates on this report"
                  />
                </Grid>
              </>
            )}

            <Grid size={{ xs: 12 }}>
              <Field.Checkbox
                name="protectionNeeded"
                label="I am concerned about retaliation and may need whistleblower protection"
              />
            </Grid>
          </Grid>
        </Box>

        {/* Legal Notice */}
        <Alert severity="warning" sx={{ mb: 4 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Important Legal Information
          </Typography>
          • Filing a false report is a crime
          <br />
          • You are protected by whistleblower laws if reporting in good faith
          <br />
          • This report will be forwarded to appropriate investigative authorities
          <br />• Retaliation against whistleblowers is prohibited by law
        </Alert>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            onClick={() => reset()}
            startIcon={<Iconify icon="solar:refresh-bold" />}
          >
            Clear Form
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            endIcon={<Iconify icon="solar:shield-check-bold" />}
            color="error"
          >
            Submit Report Securely
          </Button>
        </Box>
      </Card>
    </Form>
  );

  // Prevent hydration mismatch
  if (!isClient) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 8 }}>
          <Typography variant="h2" sx={{ mb: 3, textAlign: 'center' }}>
            Whistleblower Portal
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: 'text.primary',
              maxWidth: 900,
              mx: 'auto',
              lineHeight: 1.8,
              mb: 3,
              textAlign: 'justify',
            }}
          >
            Report government misconduct, fraud, waste, or abuse safely and securely. Your identity is protected, and retaliation is prohibited by law.
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: 'text.primary',
              maxWidth: 900,
              mx: 'auto',
              lineHeight: 1.8,
              mb: 3,
              textAlign: 'justify',
            }}
          >
            A secure, anonymous channel for insiders to report waste, fraud, mismanagement, abuse, or corruption. Sometimes the most critical information comes from within. But without protection, employees and contractors risk retaliation if they speak up. A trusted, independent portal creates a safe way for truth to come forward. Courageous individuals shouldn't lose their livelihoods for doing what is right. This feature ensures that insiders have a voice — and that their warnings can help stop wrongdoing before it drains public resources or undermines trust in government.
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: 'text.primary',
              maxWidth: 900,
              mx: 'auto',
              lineHeight: 1.8,
              textAlign: 'justify',
            }}
          >
            Report concerns about waste, fraud, mismanagement, abuse, or corruption here. Each submission is protected to ensure your information is handled securely and responsibly.
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <MotionViewport>
        {/* Hero Section */}
        <Box sx={{ py: 6 }}>
          <m.div variants={varFade('inUp')}>
            <Typography variant="h2" sx={{ mb: 3, textAlign: 'center' }}>
              Whistleblower Portal
            </Typography>
          </m.div>

          <m.div variants={varFade('inUp')}>
            <Typography
              variant="body1"
              sx={{
                color: 'text.primary',
                maxWidth: 900,
                mx: 'auto',
                lineHeight: 1.8,
                mb: 3,
                textAlign: 'justify',
              }}
            >
              Report government misconduct, fraud, waste, or abuse safely and securely. Your identity is protected, and retaliation is prohibited by law.
            </Typography>
          </m.div>

          <m.div variants={varFade('inUp')}>
            <Typography
              variant="body1"
              sx={{
                color: 'text.primary',
                maxWidth: 900,
                mx: 'auto',
                lineHeight: 1.8,
                mb: 3,
                textAlign: 'justify',
              }}
            >
              A secure, anonymous channel for insiders to report waste, fraud, mismanagement, abuse, or corruption. Sometimes the most critical information comes from within. But without protection, employees and contractors risk retaliation if they speak up. A trusted, independent portal creates a safe way for truth to come forward. Courageous individuals shouldn't lose their livelihoods for doing what is right. This feature ensures that insiders have a voice — and that their warnings can help stop wrongdoing before it drains public resources or undermines trust in government.
            </Typography>
          </m.div>

          <m.div variants={varFade('inUp')}>
            <Typography
              variant="body1"
              sx={{
                color: 'text.primary',
                maxWidth: 900,
                mx: 'auto',
                lineHeight: 1.8,
                textAlign: 'justify',
              }}
            >
              Report concerns about waste, fraud, mismanagement, abuse, or corruption here. Each submission is protected to ensure your information is handled securely and responsibly.
            </Typography>
          </m.div>
        </Box>

        {/* Protection Information - Compact */}
        <m.div variants={varFade('inUp')}>
          <Card sx={{ p: 3, mb: 4, bgcolor: alpha(theme.palette.success.main, 0.04) }}>
            <Grid container spacing={3} alignItems="center">
              <Grid size={{ xs: 12, md: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      bgcolor: alpha(theme.palette.success.main, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Iconify
                      icon="solar:shield-check-bold"
                      width={24}
                      sx={{ color: 'success.main' }}
                    />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2">Legal Protection</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Protected by law
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      bgcolor: alpha(theme.palette.info.main, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Iconify icon="solar:eye-closed-bold" width={24} sx={{ color: 'info.main' }} />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2">Anonymous Option</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Fully confidential
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      bgcolor: alpha(theme.palette.warning.main, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Iconify
                      icon="solar:lock-password-bold"
                      width={24}
                      sx={{ color: 'warning.main' }}
                    />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2">Secure Processing</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Encrypted transmission
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Card>
        </m.div>

        {/* Report Form */}
        <m.div variants={varFade('inUp')}>
          <Box sx={{ mb: 6 }}>{renderReportForm()}</Box>
        </m.div>

        {/* Resources - Compact */}
        <m.div variants={varFade('inUp')}>
          <Card sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 2,
                }}
              >
                <Iconify icon="solar:book-bold" width={24} sx={{ color: 'primary.main' }} />
              </Box>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6">Whistleblower Resources</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Legal guides and support services
                </Typography>
              </Box>
            </Box>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper
                  sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.04),
                      boxShadow: theme.shadows[2],
                    },
                  }}
                  component="a"
                  href="/downloads/whistleblower-rights-guide.pdf"
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1,
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Iconify icon="solar:scale-bold" width={20} sx={{ color: 'primary.main' }} />
                  </Box>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" noWrap>
                      Know Your Rights Guide
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Legal protections & laws
                    </Typography>
                  </Box>
                  <Iconify
                    icon="solar:download-bold"
                    width={20}
                    sx={{ color: 'text.secondary', flexShrink: 0 }}
                  />
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper
                  sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.04),
                      boxShadow: theme.shadows[2],
                    },
                  }}
                  component="a"
                  href="/contact"
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1,
                      bgcolor: alpha(theme.palette.info.main, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Iconify icon="solar:phone-bold" width={20} sx={{ color: 'info.main' }} />
                  </Box>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" noWrap>
                      Get Support
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Legal consultation & help
                    </Typography>
                  </Box>
                  <Iconify
                    icon="solar:arrow-right-bold"
                    width={20}
                    sx={{ color: 'text.secondary', flexShrink: 0 }}
                  />
                </Paper>
              </Grid>
            </Grid>
          </Card>
        </m.div>
      </MotionViewport>
    </Container>
  );
}
