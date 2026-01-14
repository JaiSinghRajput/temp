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
  VideoCameraBack as EVideoIcon,
  ColorLens as ColorsIcon,
  Checkroom as DressesIcon,
  CardGiftcard as GiftsIcon,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';

type NavItem = { key: string; name: string; href?: string; children?: NavItem[] };
type Section = { key: string; title: string; items?: NavItem[]; href?: string };

const DRAWER_WIDTH = 256;

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const sections: Section[] = useMemo(() => {
    if (user?.role === 'editor') {
      return [
        {
          key: 'e-video-requests',
          title: 'E-Video Requests',
          href: '/admin/e-video/requests',
        },
      ];
    }

    return [
      { key: 'dashboard', title: 'Dashboard', href: '/admin' },
      {
        key: 'templates',
        title: 'Cards',
        items: [
          { key: 'cards-all', name: 'All Cards', href: '/admin/e-card' },
          { key: 'cards-create', name: 'Create Card', href: '/admin/e-card/add' },
        ],
      },
      {
        key: 'e-video',
        title: 'E-Video',
        items: [
          { key: 'evideo-all', name: 'All Video', href: '/admin/e-video' },
          { key: 'evideo-create', name: 'Create Video Invite', href: '/admin/e-video/add' },
          { key: 'evideo-requests', name: 'Requests', href: '/admin/e-video/requests' },
        ],
      },
      {
        key: 'categories',
        title: 'Categories',
        items: [
          {
            key: 'categories-card',
            name: 'Card',
            children: [
              { key: 'categories-card-main', name: 'Categories', href: '/admin/categories/card/categories' },
              { key: 'categories-card-sub', name: 'Subcategories', href: '/admin/categories/card/subcategories' },
            ],
          },
          {
            key: 'categories-video',
            name: 'Video',
            children: [
              { key: 'categories-video-main', name: 'Categories', href: '/admin/categories/video/categories' },
              { key: 'categories-video-sub', name: 'Subcategories', href: '/admin/categories/video/subcategories' },
            ],
          },
          {
            key: 'categories-dresses',
            name: 'Dresses',
            children: [
              { key: 'categories-dresses-main', name: 'Categories', href: '/admin/categories/dresses/categories' },
              { key: 'categories-dresses-sub', name: 'Subcategories', href: '/admin/categories/dresses/subcategories' },
            ],
          },
          {
            key: 'categories-gifts',
            name: 'Gifts',
            children: [
              { key: 'categories-gifts-main', name: 'Categories', href: '/admin/categories/gifts/categories' },
              { key: 'categories-gifts-sub', name: 'Subcategories', href: '/admin/categories/gifts/subcategories' },
            ],
          },
        ],
      },
      {
        key: 'dresses',
        title: 'Dresses',
        items: [
          { key: 'dresses-all', name: 'All Dresses', href: '/admin/dresses' },
          { key: 'dresses-create', name: 'Create Dress', href: '/admin/dresses/add' },
        ],
      },
      {
        key: 'gifts',
        title: 'Gifts',
        items: [
          { key: 'gifts-all', name: 'All Gifts', href: '/admin/gifts' },
          { key: 'gifts-create', name: 'Create Gift', href: '/admin/gifts/add' },
        ],
      },
      { key: 'fonts', title: 'Fonts', href: '/admin/fonts' },
      { key: 'colors', title: 'Colors', href: '/admin/colors' },
    ];
  }, [user]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    templates: true,
    'e-video': true,
    categories: true,
    'categories-card': true,
    'categories-video': true,
  });

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
      case 'colors':
        return <ColorsIcon />;
      case 'e-video':
        return <EVideoIcon />;
      case 'dresses':
        return <DressesIcon />;
      case 'gifts':
        return <GiftsIcon />;
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

          const renderNavItems = (items: NavItem[], depth = 1) => (
            items.map((item) => {
              const hasGrandChildren = item.children && item.children.length > 0;
              const isItemActive = item.href ? isActive(item.href) : false;
              const paddingLeft = 4 + depth * 2;

              return (
                <Box key={item.key}>
                  {hasGrandChildren ? (
                    <>
                      <ListItemButton
                        onClick={() => toggleGroup(item.key)}
                        sx={{
                          pl: paddingLeft,
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
                            fontWeight: 500,
                          }}
                        />
                        {openGroups[item.key] ? <ExpandLess /> : <ExpandMore />}
                      </ListItemButton>
                      <Collapse in={openGroups[item.key]} timeout="auto" unmountOnExit>
                        <List component="div" disablePadding>
                          {renderNavItems(item.children!, depth + 1)}
                        </List>
                      </Collapse>
                    </>
                  ) : (
                    <ListItemButton
                      component={Link}
                      href={item.href || '#'}
                      sx={{
                        pl: paddingLeft,
                        backgroundColor: isItemActive
                          ? 'action.selected'
                          : 'transparent',
                        color: isItemActive ? 'primary.main' : 'text.primary',
                        fontWeight: isItemActive ? 600 : 400,
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
                  )}
                </Box>
              );
            })
          );

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
                      {renderNavItems(section.items!)}
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
