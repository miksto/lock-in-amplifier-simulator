import { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  MarkerType,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  ReferenceOscillatorBlock,
  DUTModulatorBlock,
  NoiseInjectorBlock,
  BandPassFilterBlock,
  MixerOutputBlock,
  LowPassFilterBlock,
  OutputBlock,
} from './blocks';
import { useSimulationStore, type FftBlockId } from '../../store';
import './BlockDiagram.css';

// Map node IDs to FFT block IDs
const nodeToFftBlock: Record<string, FftBlockId> = {
  'reference-oscillator': 'reference',
  'dut-modulator': 'modulator',
  'noise-injector': 'noise',
  'bandpass-filter': 'bpf',
  'psd-i': 'mixerI',
  'psd-q': 'mixerQ',
  'lpf-i': 'lpfI',
  'lpf-q': 'lpfQ',
  'output': 'output',
};

// Custom node components that wrap existing blocks with handles
function ReferenceOscillatorNode() {
  return (
    <>
      <ReferenceOscillatorBlock />
      <Handle type="source" position={Position.Right} />
    </>
  );
}

function DUTModulatorNode() {
  return (
    <>
      <Handle type="target" position={Position.Left} />
      <DUTModulatorBlock />
      <Handle type="source" position={Position.Right} />
    </>
  );
}

function NoiseInjectorNode() {
  return (
    <>
      <Handle type="target" position={Position.Left} />
      <NoiseInjectorBlock />
      <Handle type="source" position={Position.Right} id="to-bpf" />
    </>
  );
}

function BandPassFilterNode() {
  return (
    <>
      <Handle type="target" position={Position.Top} id="top" />
      <Handle type="target" position={Position.Left} id="left" />
      <BandPassFilterBlock />
      <Handle type="source" position={Position.Right} id="right" />
    </>
  );
}

function PsdINode() {
  return (
    <>
      <Handle type="target" position={Position.Left} />
      <MixerOutputBlock channel="I" showControls />
      <Handle type="source" position={Position.Right} />
    </>
  );
}

function PsdQNode() {
  return (
    <>
      <Handle type="target" position={Position.Left} />
      <MixerOutputBlock channel="Q" />
      <Handle type="source" position={Position.Right} />
    </>
  );
}

function LpfINode() {
  return (
    <>
      <Handle type="target" position={Position.Left} />
      <LowPassFilterBlock channel="I" showControls />
      <Handle type="source" position={Position.Right} />
    </>
  );
}

function LpfQNode() {
  return (
    <>
      <Handle type="target" position={Position.Left} />
      <LowPassFilterBlock channel="Q" />
      <Handle type="source" position={Position.Right} />
    </>
  );
}

function OutputNode() {
  return (
    <>
      <Handle type="target" position={Position.Left} id="top" style={{ top: '30%' }} />
      <Handle type="target" position={Position.Left} id="bottom" style={{ top: '70%' }} />
      <OutputBlock />
    </>
  );
}

// Input label node
function InputLabelNode() {
  return (
    <>
      <Handle type="target" position={Position.Top} />
      <div className="input-label" style={{ borderColor: '#8892b0' }}>Sensor Input</div>
      <Handle type="source" position={Position.Right} />
    </>
  );
}

// Invisible waypoints for edge routing
function WaypointLeftBottomNode() {
  return (
    <div className="waypoint-node">
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

function WaypointRightBottomNode() {
  return (
    <div className="waypoint-node">
      <Handle type="target" position={Position.Right} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
function WaypointRightLeftNode() {
  return (
    <div className="waypoint-node">
      <Handle type="target" position={Position.Right} />
      <Handle type="source" position={Position.Left} />
    </div>
  );
}


function WaypointTopBottomNode() {
  return (
      <div className="waypoint-node">
        <Handle type="target" position={Position.Top} />
        <Handle type="source" position={Position.Bottom} />
      </div>
  );
}

// Group node that renders a visible background
function GroupNode({ data }: { data: { label: string; variant: string } }) {
  return (
    <div className={`group-background group-background--${data.variant}`}>
      <div className="group-background__label">{data.label}</div>
    </div>
  );
}

const nodeTypes = {
  referenceOscillator: ReferenceOscillatorNode,
  dutModulator: DUTModulatorNode,
  noiseInjector: NoiseInjectorNode,
  bandpassFilter: BandPassFilterNode,
  psdI: PsdINode,
  psdQ: PsdQNode,
  lpfI: LpfINode,
  lpfQ: LpfQNode,
  output: OutputNode,
  inputLabel: InputLabelNode,
  group: GroupNode,
  waypointLeftBottom: WaypointLeftBottomNode,
  waypointRightBottom: WaypointRightBottomNode,
  waypointRightLeft: WaypointRightLeftNode,
  waypointTopBottom: WaypointTopBottomNode,
};

const initialNodes: Node[] = [
  // Subflow parent nodes (expandParent on children auto-sizes these)
  {
    id: 'group-signal-gen',
    type: 'group',
    position: { x: 0, y: 20 },
    data: { label: 'Signal Generation (DUT Simulation)', variant: 'signal-generation' },
    draggable: false,
    selectable: false,
  },
  {
    id: 'group-lockin',
    type: 'group',
    position: { x: 0, y: 290 },
    data: { label: 'Lock-in Amplifier', variant: 'lock-in' },
    draggable: false,
    selectable: false,
  },
  // Signal generation row (children of group-signal-gen)
  // Y positions offset to align vertical centers (handles) for straight connection lines
  {
    id: 'reference-oscillator',
    type: 'referenceOscillator',
    position: { x: 20, y: 30 },
    parentId: 'group-signal-gen',
    expandParent: true,
    data: {},
  },
  {
    id: 'dut-modulator',
    type: 'dutModulator',
    position: { x: 220, y: 15 },
    parentId: 'group-signal-gen',
    expandParent: true,
    data: {},
  },
  {
    id: 'noise-injector',
    type: 'noiseInjector',
    position: { x: 450, y: 45 },
    parentId: 'group-signal-gen',
    expandParent: true,
    data: {},
  },
  // Lock-in amplifier row (children of group-lockin)
  {
    id: 'input-label',
    type: 'inputLabel',
    position: { x: 7, y: 137 },
    parentId: 'group-lockin',
    expandParent: true,
    data: {},
    draggable: false,
    selectable: false,
  },
  {
    id: 'bandpass-filter',
    type: 'bandpassFilter',
    position: { x: 150, y: 20 },
    parentId: 'group-lockin',
    expandParent: true,
    data: {},
  },
  {
    id: 'psd-i',
    type: 'psdI',
    position: { x: 370, y: 38 },
    parentId: 'group-lockin',
    expandParent: true,
    data: {},
  },
  {
    id: 'psd-q',
    type: 'psdQ',
    position: { x: 370, y: 205 },
    parentId: 'group-lockin',
    expandParent: true,
    data: {},
  },
  {
    id: 'lpf-i',
    type: 'lpfI',
    position: { x: 570, y: 25 },
    parentId: 'group-lockin',
    expandParent: true,
    data: {},
  },
  {
    id: 'lpf-q',
    type: 'lpfQ',
    position: { x: 570, y: 205 },
    parentId: 'group-lockin',
    expandParent: true,
    data: {},
  },
  {
    id: 'output',
    type: 'output',
    position: { x: 770, y: 90 },
    parentId: 'group-lockin',
    expandParent: true,
    data: {},
  },
  // Invisible waypoint to route edge around blocks
  {
    id: 'waypoint-1',
    type: 'waypointTopBottom',
    position: { x: 640, y: 150 },
    parentId: 'group-signal-gen',
    data: {},
    draggable: false,
    selectable: false,
  },
  {
    id: 'waypoint-2',
    type: 'waypointRightLeft',
    position: { x: 90, y: 6 },
    parentId: 'group-lockin',
    data: {},
    draggable: false,
    selectable: false,
  },
];

const edgeDefaults = {
  type: 'smoothstep',
  style: { stroke: '#0f3460', strokeWidth: 2 },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: '#0f3460',
    width: 20,
    height: 20,
  },
};

const edgeNoArrow = {
  type: 'smoothstep',
  style: { stroke: '#0f3460', strokeWidth: 2 },
};

const initialEdges: Edge[] = [
  {
    id: 'e-ref-dut',
    source: 'reference-oscillator',
    target: 'dut-modulator',
    ...edgeDefaults,
  },
  {
    id: 'e-dut-noise',
    source: 'dut-modulator',
    target: 'noise-injector',
    ...edgeDefaults,
  },
  {
    id: 'e-noise-waypoint',
    source: 'noise-injector',
    sourceHandle: 'to-bpf',
    target: 'waypoint-1',
    ...edgeNoArrow,
  },
  {
    id: 'e-waypoint1-waypoint2',
    source: 'waypoint-1',
    target: 'waypoint-2',
    ...edgeNoArrow,
  },
  {
    id: 'e-waypoint2-input',
    source: 'waypoint-2',
    target: 'input-label',
    ...edgeDefaults,
  },
  {
    id: 'e-input-bpf',
    source: 'input-label',
    target: 'bandpass-filter',
    targetHandle: 'left',
    ...edgeDefaults,
  },
  {
    id: 'e-bpf-psd-i',
    source: 'bandpass-filter',
    target: 'psd-i',
    ...edgeDefaults,
  },
  {
    id: 'e-bpf-psd-q',
    source: 'bandpass-filter',
    target: 'psd-q',
    ...edgeDefaults,
  },
  {
    id: 'e-psd-i-lpf-i',
    source: 'psd-i',
    target: 'lpf-i',
    ...edgeDefaults,
  },
  {
    id: 'e-psd-q-lpf-q',
    source: 'psd-q',
    target: 'lpf-q',
    ...edgeDefaults,
  },
  {
    id: 'e-lpf-i-output',
    source: 'lpf-i',
    target: 'output',
    targetHandle: 'top',
    ...edgeDefaults,
  },
  {
    id: 'e-lpf-q-output',
    source: 'lpf-q',
    target: 'output',
    targetHandle: 'bottom',
    ...edgeDefaults,
  },
];

export function BlockDiagram() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);
  const setSelectedFftBlock = useSimulationStore((s) => s.setSelectedFftBlock);

  const proOptions = useMemo(() => ({ hideAttribution: true }), []);

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    const fftBlockId = nodeToFftBlock[node.id];
    if (fftBlockId) {
      setSelectedFftBlock(fftBlockId);
    }
  }, [setSelectedFftBlock]);

  return (
    <div className="block-diagram">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        proOptions={proOptions}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 0.95 }}
        minZoom={0.5}
        maxZoom={1.5}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
      />
    </div>
  );
}
