"use client";
import { AdminSidebar } from '@/components/admin/sidebar';
import { Box } from '@mui/material';

const DRAWER_WIDTH = 0;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
            <AdminSidebar />
            <Box
                component="main"
                sx={{
                    flex: 1,
                    marginLeft: `${DRAWER_WIDTH}px`,
                }}
            >
                {children}
            </Box>
        </Box>
    );
}
