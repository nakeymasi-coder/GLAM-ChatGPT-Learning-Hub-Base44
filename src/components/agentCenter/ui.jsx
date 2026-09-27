import React from 'react';
export const card = 'rounded-2xl border border-border bg-card p-5 shadow-sm';
export const input = 'w-full min-h-11 rounded-xl border border-input bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring';
export const primary = 'min-h-11 rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50';
export const secondary = 'min-h-11 rounded-xl border border-border bg-secondary px-4 py-2 font-semibold text-secondary-foreground disabled:opacity-50';
export function Panel({title,children,action}) { return <section className={card}><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="font-heading text-lg font-bold">{title}</h2>{action}</div>{children}</section> }
export function Field({label,children}) { return <label className="block space-y-1.5 text-sm font-medium text-foreground"><span>{label}</span>{children}</label> }
export function Empty({children}) { return <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">{children}</p> }
export function Failure({error}) { return error ? <p role="alert" className="rounded-xl border border-destructive p-3 text-sm text-destructive">{error}</p> : null }