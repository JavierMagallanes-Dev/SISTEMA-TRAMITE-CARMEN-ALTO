// src/components/ui/Toaster.tsx
// Wrapper de Sonner — top-center, estilo gobierno Carmen Alto.

import { Toaster as SonnerToaster } from 'sonner';

export default function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      richColors={false}
      closeButton
      duration={4500}
      gap={12}
      offset={16}
      visibleToasts={5}
      toastOptions={{
        unstyled: false,
        style: {
          width: 380,
          borderRadius: 12,
          fontFamily: 'Inter, system-ui, sans-serif',
        },
        classNames: {
          toast:
            'group bg-white shadow-lg border-l-4 ' +
            'flex items-start gap-3 p-3.5 pr-2',
          title:       'text-sm font-semibold text-gray-900 leading-snug',
          description: 'text-xs text-gray-600 mt-0.5 leading-relaxed',
          actionButton:
            '!text-xs !font-bold !uppercase !tracking-wider !bg-transparent ' +
            '!border-0 hover:underline',
          cancelButton:
            '!text-xs !text-gray-500 !bg-transparent !border-0 hover:!underline',
          closeButton:
            '!w-7 !h-7 !rounded-md !bg-transparent hover:!bg-gray-100 ' +
            '!text-gray-400 hover:!text-gray-700 !border-0',
          icon: '!hidden',
        },
      }}
      style={
        {
          '--normal-bg':      '#ffffff',
          '--normal-border':  '#e5e7eb',
          '--normal-text':    '#111827',
          '--success-bg':     '#ffffff',
          '--success-border': '#bbf7d0',
          '--success-text':   '#111827',
          '--error-bg':       '#ffffff',
          '--error-border':   '#fecaca',
          '--error-text':     '#111827',
          '--warning-bg':     '#ffffff',
          '--warning-border': '#fde68a',
          '--warning-text':   '#111827',
          '--info-bg':        '#ffffff',
          '--info-border':    '#bfdbfe',
          '--info-text':      '#111827',
        } as React.CSSProperties
      }
    />
  );
}