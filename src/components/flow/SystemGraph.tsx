'use client';

import { memo, useEffect, type RefObject } from 'react';
import {
  Background, BackgroundVariant, Controls, ReactFlow, ViewportPortal, useReactFlow, useStore,
  type EdgeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { VH, VW, curvePath } from '@/lib/layout';
import { CANVAS_SCALE } from '@/lib/particles';
import type { Kind } from '@/lib/sim';
import { BuyContext, SvcNode } from './SvcNode';
import type { FlowEdge, SvcNode as SvcNodeType } from './buildFlow';

const FlowEdgeView = memo(function FlowEdgeView({ data }: EdgeProps<FlowEdge>) {
  if (!data) return null;
  return (
    <path
      d={curvePath({ x: data.sx, y: data.sy }, { x: data.tx, y: data.ty })}
      fill="none"
      stroke={data.muted ? '#7f8fb0' : '#4cc9f0'}
      strokeOpacity={data.alpha}
      strokeWidth={1.2}
    />
  );
});

const nodeTypes = { svc: SvcNode };
const edgeTypes = { flow: FlowEdgeView };

/** Вписывает всю схему в окно при старте и при изменении размера. */
function FitToStage() {
  const { fitBounds } = useReactFlow();
  const width = useStore((st) => st.width), height = useStore((st) => st.height);
  useEffect(() => {
    if (width && height) fitBounds({ x: 0, y: 0, width: VW, height: VH }, { padding: 0.02 });
  }, [width, height, fitBounds]);
  return null;
}

interface Props {
  nodes: SvcNodeType[];
  edges: FlowEdge[];
  /** Холст частиц: рисует игровой цикл, живёт в координатах схемы и зумится вместе с ней. */
  canvasRef: RefObject<HTMLCanvasElement | null>;
  onBuy: (k: Kind) => void;
}

export function SystemGraph({ nodes, edges, canvasRef, onBuy }: Props) {
  return (
    <BuyContext value={onBuy}>
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      nodeOrigin={[0.5, 0.5]}
      colorMode="dark"
      minZoom={0.4}
      maxZoom={2.5}
      nodesDraggable={false}
      nodesConnectable={false}
      nodesFocusable={false}
      edgesFocusable={false}
      elementsSelectable={false}
      zoomOnDoubleClick={false}
    >
      <Background variant={BackgroundVariant.Dots} gap={26} size={1.2} color="#1d2a45" />
      <Controls position="top-left" showInteractive={false} />
      <ViewportPortal>
        <canvas
          ref={canvasRef}
          width={VW * CANVAS_SCALE}
          height={VH * CANVAS_SCALE}
          className="pointer-events-none absolute left-0 top-0"
          style={{ width: VW, height: VH }}
        />
      </ViewportPortal>
      <FitToStage />
    </ReactFlow>
    </BuyContext>
  );
}
