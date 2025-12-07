'use client';

import { z as zod } from 'zod';
import { useMemo, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import { alpha, useTheme } from '@mui/material/styles';

import { varFade, MotionViewport } from 'src/components/animate';
import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';

// ----------------------------------------------------------------------

const AGENCIES = [
  {
    value: 'state-budget',
    label: 'Virginia Department of Budget & Planning',
    description: 'Budget, financial planning, and appropriations',
    icon: 'solar:calculator-bold',
    foiaOfficer: 'budget.foia@virginia.gov',
  },
  {
    value: 'education',
    label: 'Virginia Department of Education',
    description: 'K-12 education, schools, and curriculum',
    icon: 'solar:book-bold',
    foiaOfficer: 'foia@doe.virginia.gov',
  },
  {
    value: 'health',
    label: 'Virginia Department of Health',
    description: 'Public health, healthcare facilities, and regulations',
    icon: 'solar:health-bold',
    foiaOfficer: 'foia@vdh.virginia.gov',
  },
  {
    value: 'transportation',
    label: 'Virginia Department of Transportation',
    description: 'Roads, highways, and transportation projects',
    icon: 'solar:highway-bold',
    foiaOfficer: 'foia@vdot.virginia.gov',
  },
  {
    value: 'general-services',
    label: 'Virginia Department of General Services',
    description: 'State buildings, procurement, and facilities',
    icon: 'solar:buildings-bold',
    foiaOfficer: 'foia@dgs.virginia.gov',
  },
  {
    value: 'local-city',
    label: 'Local City Government',
    description: 'City-level records and services',
    icon: 'solar:city-bold',
    foiaOfficer: '',
  },
  {
    value: 'local-county',
    label: 'Local County Government',
    description: 'County-level records and services',
    icon: 'solar:map-bold',
    foiaOfficer: '',
  },
  {
    value: 'other-agency',
    label: 'Other Agency',
    description: 'Other state or local government agency',
    icon: 'solar:document-bold',
    foiaOfficer: '',
  },
];

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

// ----------------------------------------------------------------------
// Form Schema

const FoiaRequestSchema = zod.object({
  agency: zod.string().min(1, 'Please select an agency'),
  recordsDescription: zod
    .string()
    .min(50, 'Please provide more detail (at least 50 characters)')
    .max(500, 'Description is too long (maximum 500 characters)'),
  startDate: zod.date().nullable(),
  endDate: zod.date().nullable(),
  contactName: zod.string().min(1, 'Name is required'),
  contactEmail: zod.string().email('Please enter a valid email address'),
  contactPhone: zod.string().optional(),
  preferredFormat: zod.enum(['electronic', 'paper', 'inspection']),
});

type FoiaRequestSchemaType = zod.infer<typeof FoiaRequestSchema>;

const defaultValues: FoiaRequestSchemaType = {
  agency: '',
  recordsDescription: '',
  startDate: null,
  endDate: null,
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  preferredFormat: 'electronic',
};

export function FoiaView() {
  const theme = useTheme();
  const [isClient, setIsClient] = useState(false);

  const methods = useForm<FoiaRequestSchemaType>({
    resolver: zodResolver(FoiaRequestSchema),
    defaultValues,
    mode: 'onChange',
  });

  const {
    handleSubmit,
    watch,
    reset,
    formState: { isSubmitting, errors },
  } = methods;

  // Handle client-side hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  const onSubmit = handleSubmit(async (data) => {
    try {
      // In a real app, this would submit to a backend
      console.log('FOIA Request Submitted:', data);
      alert('Your FOIA request has been prepared! Download the generated letter to submit to the appropriate agency.');
    } catch (error) {
      console.error('Error submitting FOIA request:', error);
    }
  });

  // Watch form values for character counter and preview
  const recordsDescription = watch('recordsDescription');
  const descriptionLength = recordsDescription?.length || 0;

  const renderTemplates = () => {
    const templates = FOIA_TEMPLATES.filter((t) => t.category === 'Templates');
    const guides = FOIA_TEMPLATES.filter((t) => t.category === 'Guides');

    return (
      <Card sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.info.main, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mr: 2,
            }}
          >
            <Iconify icon="solar:folder-with-files-bold" width={28} sx={{ color: 'info.main' }} />
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6">FOIA Templates & Resources</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Download pre-made templates or use the form generator below
            </Typography>
          </Box>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>Quick Start:</strong> Download a template for immediate use, or scroll down to use
          our interactive form generator that creates a customized request letter for you.
        </Alert>

        <Divider sx={{ mb: 3 }} />

        {/* Templates Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
            <Iconify icon="solar:document-text-bold" width={20} sx={{ mr: 1 }} />
            Request Templates
          </Typography>
          <Grid container spacing={1.5}>
            {templates.map((template) => (
              <Grid size={{ xs: 12, sm: 6 }} key={template.title}>
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
                  href={template.link}
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
                    <Iconify icon={template.icon} width={20} sx={{ color: 'primary.main' }} />
                  </Box>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" noWrap>
                      {template.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {template.format}
                    </Typography>
                  </Box>
                  <Iconify
                    icon="solar:download-bold"
                    width={20}
                    sx={{ color: 'text.secondary', flexShrink: 0 }}
                  />
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Guides Section */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
            <Iconify icon="solar:book-bold" width={20} sx={{ mr: 1 }} />
            Helpful Guides
          </Typography>
          <Grid container spacing={1.5}>
            {guides.map((guide) => (
              <Grid size={{ xs: 12, sm: 6 }} key={guide.title}>
                <Paper
                  sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.info.main, 0.04),
                      boxShadow: theme.shadows[2],
                    },
                  }}
                  component="a"
                  href={guide.link}
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
                    <Iconify icon={guide.icon} width={20} sx={{ color: 'info.main' }} />
                  </Box>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" noWrap>
                      {guide.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {guide.format}
                    </Typography>
                  </Box>
                  <Iconify
                    icon="solar:download-bold"
                    width={20}
                    sx={{ color: 'text.secondary', flexShrink: 0 }}
                  />
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Card>
    );
  };

  const renderRequestForm = () => (
    <Form methods={methods} onSubmit={onSubmit}>
      <Card sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mr: 2,
            }}
          >
            <Iconify icon="solar:document-text-bold" width={32} sx={{ color: 'primary.main' }} />
          </Box>
          <Box>
            <Typography variant="h5">FOIA Request Generator</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Complete the form below to generate your request letter
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 4 }} />

        {/* Section 1: What Records */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
            <Iconify icon="solar:document-bold" width={24} sx={{ mr: 1 }} />
            What Records Do You Need?
          </Typography>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <Field.Autocomplete
                name="agency"
                label="Government Agency"
                placeholder="Search agencies..."
                options={AGENCIES}
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
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 2,
                        }}
                      >
                        <Iconify icon={option.icon} width={20} sx={{ color: 'primary.main' }} />
                      </Box>
                      <Box sx={{ flexGrow: 1 }}>
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

            <Grid size={{ xs: 12 }}>
              <Field.Text
                name="recordsDescription"
                label="Describe the records you're seeking"
                placeholder="Be as specific as possible about the records you need, including dates, department names, and document types..."
                multiline
                rows={4}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color:
                      descriptionLength < 50
                        ? 'error.main'
                        : descriptionLength < 100
                          ? 'warning.main'
                          : 'success.main',
                  }}
                >
                  {descriptionLength}/500 characters
                  {descriptionLength < 50 && ' (minimum 50)'}
                </Typography>
              </Box>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Alert severity="info" icon={<Iconify icon="solar:lightbulb-bold" />}>
                <strong>Tip:</strong> Include specific dates, department names, and document types
                to help agencies locate records faster.
              </Alert>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Field.DatePicker name="startDate" label="From Date (Optional)" />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Field.DatePicker name="endDate" label="To Date (Optional)" />
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ mb: 4 }} />

        {/* Section 2: Contact Information */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
            <Iconify icon="solar:user-bold" width={24} sx={{ mr: 1 }} />
            Your Contact Information
          </Typography>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Field.Text name="contactName" label="Your Name" />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Field.Text name="contactEmail" label="Email Address" type="email" />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Field.Phone name="contactPhone" label="Phone Number (Optional)" />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Field.RadioGroup
                name="preferredFormat"
                label="Preferred Format"
                options={[
                  {
                    value: 'electronic',
                    label: 'Electronic (Recommended)',
                  },
                  {
                    value: 'paper',
                    label: 'Paper Copies',
                  },
                  {
                    value: 'inspection',
                    label: 'Inspection Only',
                  },
                ]}
              />
            </Grid>
          </Grid>
        </Box>

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
            endIcon={<Iconify icon="solar:document-add-bold" />}
          >
            Generate Request Letter
          </Button>
        </Box>
      </Card>
    </Form>
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
          <Box sx={{ mb: 6 }}>
            {renderTemplates()}
          </Box>
        </m.div>

        {/* Request Form Section */}
        <m.div variants={varFade('inUp')}>
          <Box sx={{ mb: 8 }}>
            <Box sx={{ mb: 3, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ mb: 1 }}>
                Or Generate a Custom Request
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Fill out the form below to create a personalized FOIA request letter
              </Typography>
            </Box>
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
