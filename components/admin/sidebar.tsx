"use client";
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Divider,
  Box,
  Typography,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Palette as TemplatesIcon,
  FolderOpen as CategoriesIcon,
  ExpandLess,
  ExpandMore,
  Home as HomeIcon,
  Logout as LogoutIcon,
  TextFields as FontsIcon,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';

type Item = { name: string; href: string };
type Section = { key: string; title: string; items?: Item[]; href?: string };

const DRAWER_WIDTH = 256;

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const sections: Section[] = useMemo(
    () => [
      { key: 'dashboard', title: 'Dashboard', href: '/admin' },
      {
        key: 'templates',
        title: 'Templates',
        items: [
          { name: 'All Templates', href: '/admin/e-card' },
          { name: 'Create Template', href: '/admin/e-card/add' },
        ],
      },
      {
        key: 'categories',
        title: 'Card Categories',
        items: [
          { name: 'Categories', href: '/admin/categories' },
          { name: 'Subcategories', href: '/admin/subcategories' },
        ],
      },
      {
        key: 'fonts',
        title: 'Fonts',
        items: [{ name: 'Font CDN Links', href: '/admin/fonts' }],
      },
    ],
    []
  );

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ templates: true });

  const toggleGroup = (key: string) => {
    setOpenGroups((s) => ({ ...s, [key]: !s[key] }));
  };

  const isActive = (href: string) => pathname === href;

  const getSectionIcon = (key: string) => {
    switch (key) {
      case 'dashboard':
        return <DashboardIcon />;
      case 'templates':
        return <TemplatesIcon />;
      case 'categories':
        return <CategoriesIcon />;
      case 'fonts':
        return <FontsIcon />;
      default:
        return null;
    }
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          borderRight: '1px solid',
          borderColor: 'divider',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          height: '56px', // h-14
          paddingX: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            textTransform: 'uppercase',
            letterSpacing: 1.5,
            fontWeight: 600,
            color: 'text.secondary',
          }}
        >
          Admin
        </Typography>
      </Box>

      {/* Navigation */}
      <List sx={{ flex: 1, overflow: 'auto' }}>
        {sections.map((section) => {
          const hasChildren = section.items && section.items.length > 0;
          const sectionActive = section.href ? isActive(section.href) : false;

          return (
            <Box key={section.key}>
              {hasChildren ? (
                <>
                  <ListItemButton
                    onClick={() => toggleGroup(section.key)}
                    sx={{
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                  >
                    <ListItemIcon>{getSectionIcon(section.key)}</ListItemIcon>
                    <ListItemText
                      primary={section.title}
                      primaryTypographyProps={{
                        variant: 'body2',
                        fontWeight: 500,
                      }}
                    />
                    {openGroups[section.key] ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>

                  {/* Child items */}
                  <Collapse in={openGroups[section.key]} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                      {section.items!.map((item) => (
                        <ListItemButton
                          key={item.href}
                          component={Link}
                          href={item.href}
                          sx={{
                            pl: 4,
                            backgroundColor: isActive(item.href)
                              ? 'action.selected'
                              : 'transparent',
                            color: isActive(item.href)
                              ? 'primary.main'
                              : 'text.primary',
                            fontWeight: isActive(item.href) ? 600 : 400,
                            '&:hover': {
                              backgroundColor: 'action.hover',
                            },
                          }}
                        >
                          <ListItemText
                            primary={item.name}
                            primaryTypographyProps={{
                              variant: 'body2',
                              fontSize: '0.875rem',
                            }}
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  </Collapse>
                </>
              ) : (
                <ListItemButton
                  component={Link}
                  href={section.href || '/admin'}
                  sx={{
                    backgroundColor: sectionActive
                      ? 'action.selected'
                      : 'transparent',
                    color: sectionActive ? 'primary.main' : 'text.primary',
                    fontWeight: sectionActive ? 600 : 400,
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <ListItemIcon>{getSectionIcon(section.key)}</ListItemIcon>
                  <ListItemText
                    primary={section.title}
                    primaryTypographyProps={{
                      variant: 'body2',
                      fontWeight: sectionActive ? 600 : 500,
                    }}
                  />
                </ListItemButton>
              )}
            </Box>
          );
        })}
      </List>

      {/* Footer */}
      <Divider />
      <Box sx={{ p: 1.5 }}>
        <ListItemButton
          onClick={async () => {
            try {
              setIsLoggingOut(true);
              await logout();
              router.push('/admin/login');
            } finally {
              setIsLoggingOut(false);
            }
          }}
          disabled={isLoggingOut}
          sx={{
            borderRadius: 1,
            mb: 0.5,
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary={isLoggingOut ? 'Logging out...' : 'Logout'}
            primaryTypographyProps={{
              variant: 'body2',
              fontSize: '0.875rem',
            }}
          />
        </ListItemButton>

        <ListItemButton
          component={Link}
          href="/"
          sx={{
            borderRadius: 1,
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <HomeIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Back to site"
            primaryTypographyProps={{
              variant: 'body2',
              fontSize: '0.875rem',
            }}
          />
        </ListItemButton>
      </Box>
    </Drawer>
  );
}
