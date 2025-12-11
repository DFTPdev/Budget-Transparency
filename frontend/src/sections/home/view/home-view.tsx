'use client';

import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import { alpha, useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';

import { varFade, MotionViewport } from 'src/components/animate';
import { Iconify } from 'src/components/iconify';
import { BackgroundShape } from 'src/assets/illustrations';
import { FloatPlusIcon, FloatDotIcon, CircleSvg } from '../components/svg-elements';

// ----------------------------------------------------------------------

const FEATURES = [
  {
    title: 'Budget Decoder',
    description: 'Government budgets are dense by design. The Decoder turns technical documents into plain English and clear charts. Every line item shows where tax dollars go—schools, public safety, healthcare, or pet projects—so you can check whether spending matches community priorities.',
    shortDescription: 'Decode government spending data',
    icon: 'solar:chart-bold-duotone',
    href: '/budget-decoder',
    color: 'primary',
    ctaText: 'Open the Decoder',
  },
  {
    title: 'Spotlight Map',
    description: 'Spending isn\'t abstract—it lands in neighborhoods. The Spotlight Map connects dollars to places: roads paved, grants awarded, projects delayed. See whether your community is being fairly invested in—or left behind.',
    shortDescription: 'Map spending across districts',
    icon: 'solar:map-point-bold-duotone',
    href: '/spotlight-map',
    color: 'secondary',
    ctaText: 'View the Map',
  },
  {
    title: 'FOIA Toolkit',
    description: 'You have the right to public records. Our step-by-step guide and templates make Virginia FOIA requests simple, so agencies can\'t hide behind process. Use FOIA to get answers and shine light where it\'s needed.',
    shortDescription: 'Request public records with ease',
    icon: 'solar:document-text-bold-duotone',
    href: '/foia',
    color: 'info',
    ctaText: 'Use the Toolkit',
  },
  {
    title: 'Whistleblower Portal',
    description: 'Report waste, fraud, abuse, or corruption safely. Our secure, independent portal protects your identity and explains your legal rights. Courageous disclosures stop wrongdoing before it drains public resources.',
    shortDescription: 'Report misconduct securely',
    icon: 'solar:shield-check-bold-duotone',
    href: '/whistleblower',
    color: 'warning',
    ctaText: 'Report Securely',
  },
];

export function HomeView() {
  const theme = useTheme();

  const renderHero = () => (
    <Box
      sx={{
        py: { xs: 10, md: 15 },
        position: 'relative',
        background: '#012767',
        overflow: 'hidden',
        minHeight: { xs: 'auto', md: '80vh' },
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
        <Grid container spacing={6} alignItems="center">
          {/* Left Column - Text Content */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Stack spacing={6} sx={{ textAlign: { xs: 'center', md: 'left' }, alignItems: { xs: 'center', md: 'flex-start' } }}>
              <Typography
                variant="h1"
                sx={{
                  fontSize: { xs: '2.8rem', md: '4rem', lg: '4.5rem' },
                  fontWeight: 800,
                  color: '#ffffff',
                  mb: 2,
                  lineHeight: 1.1,
                }}
              >
                See where Virginia's money goes.
              </Typography>

              <Typography
                variant="h5"
                sx={{
                  color: alpha('#ffffff', 0.9),
                  fontWeight: 400,
                  maxWidth: 700,
                  lineHeight: 1.6,
                  fontSize: { xs: '1.15rem', md: '1.35rem' },
                }}
              >
                Budgets shouldn't be a black box. We translate state budget jargon into plain language and visuals so anyone can follow the money.
              </Typography>

              <div>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={3}
                  sx={{ mt: 4 }}
                >
                  <Button
                    variant="contained"
                    size="large"
                    href="/budget-decoder"
                    startIcon={<Iconify icon="solar:chart-bold" />}
                    sx={{
                      px: 5,
                      py: 2,
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      borderRadius: 2,
                      backgroundColor: '#ffffff',
                      color: '#012767',
                      boxShadow: theme.shadows[8],
                      '&:hover': {
                        backgroundColor: alpha('#ffffff', 0.9),
                        boxShadow: theme.shadows[12],
                        transform: 'translateY(-2px)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    Explore the Budget
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    href="/spotlight-map"
                    startIcon={<Iconify icon="solar:map-point-bold" />}
                    sx={{
                      px: 5,
                      py: 2,
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      borderRadius: 2,
                      borderWidth: 2,
                      borderColor: '#ffffff',
                      color: '#ffffff',
                      '&:hover': {
                        borderWidth: 2,
                        borderColor: '#ffffff',
                        transform: 'translateY(-2px)',
                        backgroundColor: alpha('#ffffff', 0.1),
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    See the Map
                  </Button>
                </Stack>
              </div>
            </Stack>
          </Grid>

          {/* Right Column - DFTP Image */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Box
              sx={{
                width: '100%',
                maxWidth: 500,
                height: 'auto',
                mx: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 400,
              }}
            >
              <Box
                component="img"
                src="/assets/images/home/dftp-logo.png"
                alt="Don't Fuck The People"
                onError={(e: any) => {
                  e.target.style.display = 'none';
                }}
                sx={{
                  width: '100%',
                  height: 'auto',
                }}
              />
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );

  const renderMission = () => (
    <Box
      sx={{
        py: { xs: 10, md: 15 },
        bgcolor: '#BE2937',
      }}
    >
      <Container maxWidth="lg">
        <Stack spacing={6} sx={{ textAlign: 'center', maxWidth: 900, mx: 'auto' }}>
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, color: '#ffffff' }}>
            Our Mission
          </Typography>

          <Typography
            variant="h5"
            sx={{
              color: alpha('#ffffff', 0.95),
              fontWeight: 400,
              lineHeight: 1.8,
              fontSize: { xs: '1.1rem', md: '1.25rem' },
              maxWidth: 700,
              mx: 'auto',
            }}
          >
            DFTP empowers citizens with the tools and knowledge needed to understand government spending,
            access public records, and hold elected officials accountable.
          </Typography>

          {/* Key principles */}
          <Grid container spacing={4} sx={{ mt: 2 }}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack spacing={2} sx={{ textAlign: 'center' }}>
                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    bgcolor: alpha('#ffffff', 0.2),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                  }}
                >
                  <Iconify icon="solar:book-open-bold-duotone" width={28} sx={{ color: '#ffffff' }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#ffffff' }}>
                  Civic Education
                </Typography>
                <Typography variant="body2" sx={{ color: alpha('#ffffff', 0.9), lineHeight: 1.6 }}>
                  Empowering citizens with knowledge and tools for civic engagement
                </Typography>
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Stack spacing={2} sx={{ textAlign: 'center' }}>
                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    bgcolor: alpha('#ffffff', 0.2),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                  }}
                >
                  <Iconify icon="solar:database-bold-duotone" width={28} sx={{ color: '#ffffff' }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#ffffff' }}>
                  Open Data
                </Typography>
                <Typography variant="body2" sx={{ color: alpha('#ffffff', 0.9), lineHeight: 1.6 }}>
                  Making government data accessible and understandable for all
                </Typography>
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Stack spacing={2} sx={{ textAlign: 'center' }}>
                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    bgcolor: alpha('#ffffff', 0.2),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                  }}
                >
                  <Iconify icon="solar:eye-bold-duotone" width={28} sx={{ color: '#ffffff' }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#ffffff' }}>
                  Transparency
                </Typography>
                <Typography variant="body2" sx={{ color: alpha('#ffffff', 0.9), lineHeight: 1.6 }}>
                  Building accountability through transparent reporting and oversight
                </Typography>
              </Stack>
            </Grid>
          </Grid>
        </Stack>
      </Container>
    </Box>
  );

  const renderFeatures = () => (
    <Box
      sx={{
        py: { xs: 8, md: 12 },
        bgcolor: '#EBF5ED',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background decorative elements */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.03,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.4'%3E%3Cpath d='M50 50m-25 0a25,25 0 1,1 50,0a25,25 0 1,1 -50,0'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '100px 100px',
        }}
      />

      {/* Subtle background circle */}
      <CircleSvg
        sx={{
          opacity: 0.02,
          color: 'primary.main',
          width: 400,
          height: 400,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
        <Stack spacing={2} sx={{ textAlign: 'center', mb: 8 }}>
          <Typography variant="h3" sx={{ fontWeight: 700 }}>
            Tools to follow the money
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: '#2E3B3E',
              fontWeight: 400,
              maxWidth: 600,
              mx: 'auto',
              lineHeight: 1.6,
            }}
          >
            Explore our suite of transparency tools designed for citizens, journalists, and civic organizations.
          </Typography>
        </Stack>

        {/* 2x2 Grid Layout */}
        <Grid container spacing={{ xs: 3, md: 4 }} sx={{ maxWidth: 1000, mx: 'auto' }}>
          {FEATURES.map((feature, index) => (
            <Grid size={{ xs: 12, sm: 6 }} key={feature.title}>
              <Card
                  sx={{
                    height: '100%',
                    minHeight: 280,
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    '&:hover': {
                      transform: 'translateY(-12px) scale(1.02)',
                      boxShadow: theme.shadows[20],
                      '& .feature-icon': {
                        transform: 'scale(1.1) rotate(5deg)',
                      },
                      '& .feature-bg': {
                        transform: 'scale(1.1)',
                        opacity: 0.15,
                      },
                    },
                  }}
                  onClick={() => window.location.href = feature.href}
                >
                  {/* Background gradient shape */}
                  <Box
                    className="feature-bg"
                    sx={{
                      position: 'absolute',
                      top: -20,
                      right: -20,
                      width: 120,
                      height: 120,
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, ${alpha(theme.palette[feature.color as keyof typeof theme.palette].main, 0.1)}, ${alpha(theme.palette[feature.color as keyof typeof theme.palette].light, 0.05)})`,
                      transition: 'all 0.4s ease',
                      opacity: 0.08,
                    }}
                  />

                  <CardContent sx={{ p: 4, textAlign: 'center', position: 'relative', zIndex: 2 }}>
                    <Box
                      className="feature-icon"
                      sx={{
                        width: 88,
                        height: 88,
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${alpha(theme.palette[feature.color as keyof typeof theme.palette].main, 0.15)}, ${alpha(theme.palette[feature.color as keyof typeof theme.palette].light, 0.08)})`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 3,
                        transition: 'all 0.4s ease',
                        border: `2px solid ${alpha(theme.palette[feature.color as keyof typeof theme.palette].main, 0.1)}`,
                      }}
                    >
                      <Iconify
                        icon={feature.icon}
                        width={44}
                        sx={{ color: `${feature.color}.main` }}
                      />
                    </Box>

                    <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                      {feature.title}
                    </Typography>

                    <Typography
                      variant="body2"
                      sx={{
                        color: 'text.secondary',
                        mb: 3,
                        lineHeight: 1.7,
                        minHeight: { xs: 'auto', md: 120 },
                      }}
                    >
                      {feature.description}
                    </Typography>

                    <Button
                      variant="text"
                      endIcon={<Iconify icon="solar:arrow-right-linear" />}
                      sx={{
                        color: `${feature.color}.main`,
                        fontWeight: 600,
                        '&:hover': {
                          backgroundColor: alpha(theme.palette[feature.color as keyof typeof theme.palette].main, 0.08),
                        },
                      }}
                    >
                      {feature.ctaText}
                    </Button>
                  </CardContent>
                </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );

  const renderCallToAction = () => (
    <Box
      sx={{
        py: { xs: 10, md: 15 },
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.04)} 0%, ${alpha(theme.palette.secondary.main, 0.04)} 100%)`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background decoration */}
      <Box
        sx={{
          position: 'absolute',
          top: '20%',
          right: '10%',
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, transparent)`,
          filter: 'blur(30px)',
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
        <Stack spacing={5} sx={{ textAlign: 'center', maxWidth: 800, mx: 'auto' }}>
            <Typography variant="h3" sx={{ fontWeight: 700 }}>
              Get Involved
            </Typography>

            <Typography
              variant="h6"
              sx={{
                color: 'text.secondary',
                fontWeight: 400,
                lineHeight: 1.7,
                fontSize: { xs: '1.1rem', md: '1.25rem' },
              }}
            >
              Join the movement for government transparency. Whether you're a citizen, journalist,
              or civic organization, there are many ways to contribute to fiscal accountability.
            </Typography>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={4}
              sx={{ justifyContent: 'center', mt: 6 }}
            >
              <Button
                variant="contained"
                size="large"
                startIcon={<Iconify icon="solar:phone-bold" />}
                href="/contact"
                sx={{
                  px: 6,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  borderRadius: 2,
                  boxShadow: theme.shadows[8],
                  '&:hover': {
                    boxShadow: theme.shadows[12],
                    transform: 'translateY(-2px)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                Contact Us
              </Button>
              <Button
                variant="text"
                size="large"
                startIcon={<Iconify icon="solar:letter-bold" />}
                href="/subscribe"
                sx={{
                  px: 6,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                    transform: 'translateY(-2px)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                Subscribe to Updates
              </Button>
            </Stack>
          </Stack>
      </Container>
    </Box>
  );

  const renderBudgetOverview = () => (
    <Box
      sx={{
        py: { xs: 8, md: 12 },
        bgcolor: alpha(theme.palette.grey[500], 0.04),
        position: 'relative',
      }}
    >
      <Container maxWidth="lg">
        <Stack spacing={4} sx={{ textAlign: 'center', maxWidth: 800, mx: 'auto' }}>
            <Typography variant="h3" sx={{ fontWeight: 700 }}>
              Virginia's Budget at a Glance
            </Typography>

            <Typography
              variant="h6"
              sx={{
                color: 'text.secondary',
                fontWeight: 400,
                lineHeight: 1.8,
                maxWidth: 600,
                mx: 'auto',
              }}
            >
              Explore Virginia's FY 2024–26 biennial budget with interactive visualizations,
              spending breakdowns, and revenue analysis.
            </Typography>

            <Box sx={{ pt: 2 }}>
              <Button
                variant="contained"
                size="large"
                href={paths.budgetOverview}
                endIcon={<Iconify icon="solar:arrow-right-bold" />}
                sx={{
                  px: 5,
                  py: 2,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  borderRadius: 2,
                  boxShadow: theme.shadows[8],
                  '&:hover': {
                    boxShadow: theme.shadows[12],
                    transform: 'translateY(-2px)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                View Budget Overview
              </Button>
            </Box>

            {/* Quick Stats Preview */}
            <Grid container spacing={3} sx={{ mt: 4 }}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Card
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    transition: 'all 0.3s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: theme.shadows[8],
                    },
                  }}
                >
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
                    $188.2B
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Total Biennial Budget
                  </Typography>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <Card
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    transition: 'all 0.3s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: theme.shadows[8],
                    },
                  }}
                >
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'secondary.main', mb: 1 }}>
                    $66.8B
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    General Fund
                  </Typography>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <Card
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    transition: 'all 0.3s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: theme.shadows[8],
                    },
                  }}
                >
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main', mb: 1 }}>
                    $121.4B
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Non-General Fund
                  </Typography>
                </Card>
              </Grid>
            </Grid>
          </Stack>
      </Container>
    </Box>
  );

  return (
    <MotionViewport>
      {renderHero()}
      {renderMission()}
      {renderFeatures()}
      {renderBudgetOverview()}
      {renderCallToAction()}
    </MotionViewport>
  );
}
