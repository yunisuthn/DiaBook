import type * as React from 'react';
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { variant?: 'primary' | 'ghost' | 'link'; arrow?: boolean; href?: string; }
export declare function Button(props: ButtonProps): React.ReactElement;
export interface TagProps { active?: boolean; onClick?: () => void; children?: React.ReactNode; className?: string }
export declare function Tag(props: TagProps): React.ReactElement;
export interface StatusProps { tone?: 'live' | 'busy' | 'neutral'; children: React.ReactNode; className?: string }
export declare function Status(props: StatusProps): React.ReactElement;
export interface SectionHeaderProps { index: string; title: React.ReactNode; meta?: React.ReactNode; className?: string }
export declare function SectionHeader(props: SectionHeaderProps): React.ReactElement;
export interface ProjectCardProps { index: string; title: string; summary?: string; meta?: { label: string; value: string }[]; tags?: string[]; href?: string; className?: string }
export declare function ProjectCard(props: ProjectCardProps): React.ReactElement;
export interface NavBarProps { name: string; suffix?: string; homeHref?: string; links: { label: string; href?: string }[]; current?: string; action?: React.ReactNode; className?: string }
export declare function NavBar(props: NavBarProps): React.ReactElement;
export interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> { label: string; hint?: string; error?: string; multiline?: boolean }
export declare function Field(props: FieldProps): React.ReactElement;
declare global { interface Window { Onisoa: { Button: typeof Button; Tag: typeof Tag; Status: typeof Status; SectionHeader: typeof SectionHeader; ProjectCard: typeof ProjectCard; NavBar: typeof NavBar; Field: typeof Field } } }
