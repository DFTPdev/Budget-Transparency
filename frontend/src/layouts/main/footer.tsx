import type { Breakpoint } from '@mui/material/styles';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import { styled } from '@mui/material/styles';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

// ----------------------------------------------------------------------

const FooterRoot = styled('footer')(({ theme }) => ({
  position: 'relative',
  backgroundColor: theme.vars.palette.background.default,
}));

export type FooterProps = React.ComponentProps<typeof FooterRoot>;

export function Footer({
  sx,
  layoutQuery = 'md',
  ...other
}: FooterProps & { layoutQuery?: Breakpoint }) {
  return (
    <FooterRoot sx={sx} {...other}>
      <Divider />

      <Container
        sx={{
          py: 8,
          textAlign: 'center',
        }}
      >
        {/* Get Involved Section */}
        <Stack spacing={4} sx={{ maxWidth: 600, mx: 'auto' }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Get Involved
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: 'text.secondary',
              lineHeight: 1.7,
            }}
          >
            Join the movement for government transparency. Whether you're a citizen, journalist,
            or civic organization, there are many ways to contribute to fiscal accountability.
          </Typography>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={3}
            sx={{ justifyContent: 'center', mt: 4 }}
          >
            <Button
              variant="contained"
              size="large"
              startIcon={<Iconify icon="solar:phone-bold" />}
              href="/contact"
              sx={{ px: 5 }}
            >
              Contact Us
            </Button>
            <Button
              variant="text"
              size="large"
              startIcon={<Iconify icon="solar:letter-bold" />}
              href="/subscribe"
              sx={{ px: 5 }}
            >
              Subscribe to Updates
            </Button>
          </Stack>
        </Stack>

        <Typography variant="body2" sx={{ mt: 8, color: 'text.secondary' }}>
          © 2025 DFTP. All rights reserved.
        </Typography>
      </Container>
    </FooterRoot>
  );
}

// ----------------------------------------------------------------------

export function HomeFooter({ sx, ...other }: FooterProps) {
  return (
    <FooterRoot
      sx={[
        {
          py: 5,
          textAlign: 'center',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Container>
        <Box sx={{ typography: 'body2', color: 'text.secondary' }}>
          © 2025 DFTP. All rights reserved.
        </Box>
      </Container>
    </FooterRoot>
  );
}
