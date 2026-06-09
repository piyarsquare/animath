import React from 'react';
import { usePhone } from '../usePhone';
import DesktopWorkspace from './DesktopWorkspace';
import PhoneWorkspace from './PhoneWorkspace';
import type { WorkspaceProps } from './types';

/**
 * Responsive workspace entry: the windowed desktop workspace above 740px,
 * the dock + bottom-sheet phone chrome below (DESIGN-SPEC §2, §6).
 */
export default function Workspace(props: WorkspaceProps) {
  const phone = usePhone();
  return phone ? <PhoneWorkspace {...props} /> : <DesktopWorkspace {...props} />;
}
