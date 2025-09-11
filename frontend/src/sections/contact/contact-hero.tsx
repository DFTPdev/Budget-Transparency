import type { BoxProps } from '@mui/material/Box';

import { m } from 'framer-motion';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { CONFIG } from 'src/global-config';

import { varFade, MotionContainer } from 'src/components/animate';

// ----------------------------------------------------------------------

export function ContactHero({ sx, ...other }: BoxProps) {
  return (
    <Box
      component="section"
      sx={[
        (theme) => ({
          ...theme.mixins.bgGradient({
            images: [
              `linear-gradient(0deg, ${varAlpha(theme.vars.palette.grey['900Channel'], 0.8)}, ${varAlpha(theme.vars.palette.grey['900Channel'], 0.8)})`,
              `url(${CONFIG.assetsDir}/assets/images/contact/hero.webp)`,
            ],
          }),
          overflow: 'hidden',
          height: { md: 560 },
          position: 'relative',
          py: { xs: 10, md: 0 },
          display: 'flex',
          alignItems: 'center',
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Container component={MotionContainer}>
        <Box
          sx={{
            bottom: { md: 80 },
            position: { md: 'absolute' },
            textAlign: { xs: 'center', md: 'unset' },
          }}
        >
          <m.div variants={varFade('inRight')}>
            <Typography
              component="h1"
              variant="h1"
              sx={{
                color: 'common.white',
                mb: 3,
              }}
            >
              <Box component="span" sx={{ color: 'primary.main' }}>
                Contact
              </Box>{' '}
              DFTP Team
            </Typography>
          </m.div>

          <m.div variants={varFade('inRight')}>
            <Typography
              variant="h4"
              sx={{
                mt: 3,
                color: 'common.white',
                fontWeight: 'fontWeightMedium',
              }}
            >
              Get in touch with our transparency advocates
            </Typography>
          </m.div>

          <m.div variants={varFade('inRight')}>
            <Typography sx={{ color: 'grey.400', mt: 3, maxWidth: { md: 360 } }}>
              We're here to help you access government information, understand budget data, 
              and support your civic engagement efforts. Reach out for assistance with FOIA requests, 
              budget analysis, or reporting concerns.
            </Typography>
          </m.div>
        </Box>
      </Container>
    </Box>
  );
}
