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
    title: 'FOIA Toolkit',
    description: 'Access templates and guides for requesting public records under Virginia\'s Freedom of Information Act.',
    shortDescription: 'Request public records with ease',
    icon: 'solar:document-text-bold-duotone',
    href: '/foia',
    color: 'primary',
  },
  {
    title: 'Budget Decoder',
    description: 'Explore line-item budget data and understand how your tax dollars are allocated across government programs.',
    shortDescription: 'Decode government spending data',
    icon: 'solar:chart-bold-duotone',
    href: '/budget-decoder',
    color: 'secondary',
  },
  {
    title: 'Spotlight Map',
    description: 'Visualize district-level spending patterns and compare budget allocations across regions.',
    shortDescription: 'Map spending across districts',
    icon: 'solar:map-point-bold-duotone',
    href: '/spotlight-map',
    color: 'info',
  },
  {
    title: 'Whistleblower Portal',
    description: 'Report government misconduct, fraud, or abuse safely and anonymously with legal protection.',
    shortDescription: 'Report misconduct securely',
    icon: 'solar:shield-check-bold-duotone',
    href: '/whistleblower',
    color: 'warning',
  },
];

export function HomeView() {
  const theme = useTheme();

  const renderHero = () => (
    <Box
      sx={{
        py: { xs: 10, md: 15 },
        position: 'relative',
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.secondary.main, 0.08)} 100%)`,
        overflow: 'hidden',
        minHeight: { xs: 'auto', md: '80vh' },
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {/* Enhanced Background Pattern */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.04,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.4'%3E%3Ccircle cx='10' cy='10' r='2'/%3E%3Ccircle cx='70' cy='10' r='2'/%3E%3Ccircle cx='10' cy='70' r='2'/%3E%3Ccircle cx='70' cy='70' r='2'/%3E%3Ccircle cx='40' cy='40' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '80px 80px',
        }}
      />

      {/* Decorative shapes */}
      <Box
        sx={{
          position: 'absolute',
          top: '10%',
          left: '5%',
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, transparent)`,
          filter: 'blur(40px)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '15%',
          right: '8%',
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.1)}, transparent)`,
          filter: 'blur(50px)',
        }}
      />

      {/* Floating decorative elements */}
      <FloatPlusIcon sx={{ top: '20%', left: '15%', color: 'primary.main', opacity: 0.3 }} />
      <FloatPlusIcon sx={{ bottom: '25%', right: '20%', color: 'secondary.main', opacity: 0.3 }} />
      <FloatDotIcon sx={{ top: '30%', right: '10%', color: 'info.main', opacity: 0.4 }} />
      <FloatDotIcon sx={{ bottom: '35%', left: '12%', color: 'warning.main', opacity: 0.4 }} />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
        <Stack spacing={6} sx={{ textAlign: 'center', alignItems: 'center' }}>
          <m.div variants={varFade('inUp')}>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '2.8rem', md: '4rem', lg: '4.5rem' },
                fontWeight: 800,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                mb: 2,
                lineHeight: 1.1,
              }}
            >
              Democratizing Fiscal
              <br />
              Transparency
            </Typography>
          </m.div>

          <m.div variants={varFade('inUp', 0.1)}>
            <Typography
              variant="h4"
              sx={{
                color: 'text.secondary',
                fontWeight: 400,
                maxWidth: 700,
                lineHeight: 1.6,
                fontSize: { xs: '1.25rem', md: '1.5rem' },
              }}
            >
              A civic platform for accessing, understanding, and acting on public budget data.
            </Typography>
          </m.div>

          <m.div variants={varFade('inUp', 0.2)}>
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
                  boxShadow: theme.shadows[8],
                  '&:hover': {
                    boxShadow: theme.shadows[12],
                    transform: 'translateY(-2px)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                Explore Budget Decoder
              </Button>
              <Button
                variant="outlined"
                size="large"
                href="/foia"
                startIcon={<Iconify icon="solar:document-text-bold" />}
                sx={{
                  px: 5,
                  py: 2,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  borderRadius: 2,
                  borderWidth: 2,
                  '&:hover': {
                    borderWidth: 2,
                    transform: 'translateY(-2px)',
                    backgroundColor: alpha(theme.palette.primary.main, 0.04),
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                Use FOIA Toolkit
              </Button>
            </Stack>
          </m.div>
        </Stack>
      </Container>
    </Box>
  );

  const renderMission = () => (
    <Container maxWidth="lg" sx={{ py: { xs: 10, md: 15 } }}>
      <m.div variants={varFade('inUp')}>
        <Stack spacing={6} sx={{ textAlign: 'center', maxWidth: 900, mx: 'auto' }}>
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
            Our Mission
          </Typography>

          <Typography
            variant="h5"
            sx={{
              color: 'text.secondary',
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
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                  }}
                >
                  <Iconify icon="solar:book-open-bold-duotone" width={28} sx={{ color: 'primary.main' }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Civic Education
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
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
                    bgcolor: alpha(theme.palette.info.main, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                  }}
                >
                  <Iconify icon="solar:database-bold-duotone" width={28} sx={{ color: 'info.main' }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Open Data
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
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
                    bgcolor: alpha(theme.palette.secondary.main, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                  }}
                >
                  <Iconify icon="solar:eye-bold-duotone" width={28} sx={{ color: 'secondary.main' }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Transparency
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                  Building accountability through transparent reporting and oversight
                </Typography>
              </Stack>
            </Grid>
          </Grid>
        </Stack>
      </m.div>
    </Container>
  );

  const renderFeatures = () => (
    <Box
      sx={{
        py: { xs: 8, md: 12 },
        bgcolor: 'background.neutral',
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
        <m.div variants={varFade('inUp')}>
          <Stack spacing={2} sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="h3" sx={{ fontWeight: 700 }}>
              Platform Features
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: 'text.secondary',
                fontWeight: 400,
                maxWidth: 600,
                mx: 'auto',
                lineHeight: 1.6,
              }}
            >
              Explore our suite of transparency tools designed for citizens, journalists, and civic organizations.
            </Typography>
          </Stack>
        </m.div>

        {/* 2x2 Grid Layout */}
        <Grid container spacing={{ xs: 3, md: 4 }} sx={{ maxWidth: 1000, mx: 'auto' }}>
          {FEATURES.map((feature, index) => (
            <Grid size={{ xs: 12, sm: 6 }} key={feature.title}>
              <m.div variants={varFade('inUp', 0.1 * index)}>
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
                        lineHeight: 1.6,
                        minHeight: 48,
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
                      Learn More
                    </Button>
                  </CardContent>
                </Card>
              </m.div>
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
        <m.div variants={varFade('inUp')}>
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
        </m.div>
      </Container>
    </Box>
  );

  return (
    <MotionViewport>
      {renderHero()}
      {renderMission()}
      {renderFeatures()}
      {renderCallToAction()}
    </MotionViewport>
  );
}
