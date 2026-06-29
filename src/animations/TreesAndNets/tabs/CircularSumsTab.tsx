// Tab: Circular sums. A circular summation reads a single number off the distance
// matrix by walking the leaves in a circular order — here the TOUR ENERGY (the
// length of the closed walk). Plot that value across every circular order; the
// shortest tour is the "natural" circular order the net is built on.

import React, { useMemo, useState } from 'react';
import Workspace from '../../../chrome/workspace/Workspace';
import type { SectionDef, ViewDef, LayoutDef } from '../../../chrome/workspace/types';
import { Kicker } from '../../../chrome/readouts';
import { tourEnergy } from '../lib/trees';
import { canonicalOrders } from '../lib/orders';
import { ValuePlot, CircleTour, type PlotValue } from '../views/ValuePlot';
import { APP_ID, APP_TITLE, MatrixControls, useMatrixState, type NavProps } from './common';
import type { Highlight } from '../views/NetViews';

const EXPLAINER = `# Circular sums

Walk the leaves around a circle in some order and add up the distances between
consecutive leaves — that closed walk's length is the **tour energy**, one *circular
summation* of the matrix.

Every circular order gives a different tour, so the energy is a function over the
space of orders. The plot shows it for **all** of them; the tallest bar is the
**shortest tour** — the most "circular" arrangement of the leaves, and the order a
net is naturally drawn on. Click a bar to see that tour traced on the circle.

(The same atom — a scalar read off the matrix by a circular walk — is what the other
summations, like the four-point/quartet scores, are built from.)`;

export function CircularSumsTab({ nav }: { nav: NavProps }): JSX.Element {
  const st = useMatrixState('sums', 6);
  const [selected, setSelected] = useState<string | null>(null);

  const orders = useMemo(() => canonicalOrders(st.n), [st.n]);
  const values: PlotValue[] = useMemo(
    () => orders.map((o) => ({ key: o.id, label: o.label, value: tourEnergy(st.matrix, o.order) })),
    [orders, st.matrix],
  );
  const minKey = useMemo(() => values.reduce((m, v) => (v.value < m.value ? v : m), values[0])?.key, [values]);
  const selKey = selected ?? minKey;
  const selOrder = useMemo(() => orders.find((o) => o.id === selKey) ?? orders[0], [orders, selKey]);
  const selEnergy = selOrder ? tourEnergy(st.matrix, selOrder.order) : 0;
  const noop = (_: Highlight): void => {};

  const sections: SectionDef[] = [
    {
      id: 'distances', title: 'Distances', arch: 'subject', estHeight: 360,
      node: (
        <div style={{ display: 'grid', gap: 10 }}>
          <MatrixControls state={st} highlight={null} onSelect={noop} nOptions={[5, 6, 7]} />
          <Kicker>Each bar is one circular order; its height is how <b>short</b> that order's tour is. The tallest is
            the tightest tour. Click a bar to trace it.</Kicker>
        </div>
      ),
    },
  ];
  const views: ViewDef[] = [
    { id: 'plot', title: 'Tour energy over every circular order', defaultRect: { x: 360, y: 16, w: 520, h: 320 }, node: <ValuePlot values={values} selectedKey={selKey} minKey={minKey} onSelect={setSelected} /> },
    { id: 'tour', title: 'Selected order (the tour it sums)', defaultRect: { x: 360, y: 352, w: 360, h: 360 }, node: <CircleTour order={selOrder?.order ?? []} matrix={st.matrix} energy={selEnergy} /> },
  ];
  const layouts: LayoutDef[] = [
    { id: 'essentials', name: 'Essentials', open: { distances: { x: 84, y: 16 } }, views: { plot: { open: true }, tour: { open: true } } },
  ];

  return (
    <Workspace appId={`${APP_ID}-sums`} title={APP_TITLE} subtitle={`${st.n} leaves · circular summation (tour energy) over ${orders.length} orders`}
      sections={sections} views={views} layouts={layouts} defaultLayoutId="essentials" explainer={EXPLAINER} {...nav} />
  );
}
