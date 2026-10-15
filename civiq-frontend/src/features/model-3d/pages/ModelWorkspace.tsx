import { Suspense, useEffect, useMemo, useState, Component } from 'react';
import type { ReactNode } from 'react';
import * as THREE from 'three';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Grid, Box as DreiBox, Line, Html } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Ruler, Slice, Layers, MousePointerClick, Trash2 } from 'lucide-react';
import { FLOOR_LABELS, LAYER_CATEGORIES } from '@/app/config';
import { DEMO_MODEL_URL } from '@/utils/constants';

const MODEL_URL = import.meta.env.VITE_MODEL_URL || DEMO_MODEL_URL;

// Shared probe: one network check per session, reused across remounts/revisits.
let modelProbe: Promise<'glb' | 'sample'> | null = null;
function probeModel(url: string): Promise<'glb' | 'sample'> {
  if (!modelProbe) {
    modelProbe = fetch(url, { method: 'HEAD' })
      .then((r) => {
        const ct = (r.headers.get('content-type') || '').toLowerCase();
        // SPA fallbacks answer missing files with index.html (HTTP 200) — only trust non-HTML.
        return r.ok && !ct.includes('text/html') ? ('glb' as const) : ('sample' as const);
      })
      .catch(() => 'sample' as const);
  }
  return modelProbe;
}

function GltfModel({ url }: { url: string }) {
  const gltf = useLoader(GLTFLoader, url);
  return <primitive object={gltf.scene} />;
}

/** Catches GLB parse failures so the workspace falls back to the sample tower. */
class GlbGuard extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFail(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function Tower({ exploded, selected, onSelect, clip, layers, focusFloor, showConflicts }: {
  exploded: number; selected: string | null; onSelect: (id: string) => void; clip: THREE.Plane[];
  layers: string[]; focusFloor: number | null; showConflicts: boolean;
}) {
  const floors = [0, 1, 2, 3, 4];
  const dim = (f: number) => focusFloor !== null && f !== focusFloor;
  return (
    <group>
      {floors.map((f) => (
        <group key={f} position={[0, f * (2 + exploded * 2), 0]}>
          <group visible={layers.includes('structure')}>
            <DreiBox args={[8, 0.3, 6]} position={[0, 0, 0]}>
              <meshStandardMaterial color={f % 2 ? '#cbd5e1' : '#94a3b8'} transparent opacity={dim(f) ? 0.3 : 1} clippingPlanes={clip} />
            </DreiBox>
            {[[-3, -2], [3, -2], [-3, 2], [3, 2]].map(([x, z], i) => (
              <mesh key={i} position={[x, 1, z]} onClick={(e) => { e.stopPropagation(); onSelect(`col-L${f}-${i}`); }}>
                <boxGeometry args={[0.4, 2, 0.4]} />
                <meshStandardMaterial color={selected === `col-L${f}-${i}` ? '#0d9488' : '#1e3a5f'} transparent opacity={dim(f) ? 0.3 : 1} clippingPlanes={clip} />
              </mesh>
            ))}
          </group>
          <group visible={layers.includes('architecture')}>
            <mesh position={[0, 1, 0]} onClick={(e) => { e.stopPropagation(); onSelect(`slab-L${f}`); }}>
              <boxGeometry args={[7, 0.15, 5]} />
              <meshStandardMaterial color={selected === `slab-L${f}` ? '#f59e0b' : '#e2e8f0'} transparent opacity={dim(f) ? 0.25 : 0.9} clippingPlanes={clip} />
            </mesh>
          </group>
          <group visible={layers.includes('mep')}>
            <mesh position={[-1.5, 1.7, 0]}>
              <boxGeometry args={[2.5, 0.35, 0.5]} />
              <meshStandardMaterial color="#7dd3fc" transparent opacity={dim(f) ? 0.3 : 1} clippingPlanes={clip} />
            </mesh>
          </group>
          <group visible={layers.includes('electrical')}>
            <mesh position={[1.5, 1.9, 0]}>
              <boxGeometry args={[2, 0.12, 0.12]} />
              <meshStandardMaterial color="#facc15" transparent opacity={dim(f) ? 0.3 : 1} clippingPlanes={clip} />
            </mesh>
          </group>
          {showConflicts && f === 2 && (
            <mesh position={[2, 1.2, 0]}>
              <sphereGeometry args={[0.35, 16, 16]} />
              <meshStandardMaterial color="#dc2626" transparent opacity={0.85} />
            </mesh>
          )}
        </group>
      ))}
      {layers.includes('plumbing') && (
        <mesh position={[3.6, 5, 2.5]}>
          <cylinderGeometry args={[0.15, 0.15, 10, 12]} />
          <meshStandardMaterial color="#22d3ee" />
        </mesh>
      )}
    </group>
  );
}

interface Measure { id: string; a: THREE.Vector3; b: THREE.Vector3; }

function MeasureLayer({ active, measures, onAdd }: { active: boolean; measures: Measure[]; onAdd: (p: THREE.Vector3) => void }) {
  return (
    <group>
      {/* invisible capture plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} visible={false}
        onPointerDown={(e) => { if (active) { e.stopPropagation(); onAdd(e.point.clone()); } }}>
        <planeGeometry args={[60, 60]} />
      </mesh>
      {measures.map((m) => {
        const d = m.a.distanceTo(m.b);
        const mid = m.a.clone().add(m.b).multiplyScalar(0.5);
        return (
          <group key={m.id}>
            <Line points={[m.a, m.b]} color="#0d9488" lineWidth={3} />
            <Html position={mid} center>
              <span className="rounded bg-teal-700 px-1.5 py-0.5 text-[11px] font-bold text-white">{d.toFixed(2)} m</span>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

export default function ModelWorkspace() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [floor, setFloor] = useState<(typeof FLOOR_LABELS)[number]>('2F');
  const [tool, setTool] = useState<'orbit' | 'measure' | 'section'>('orbit');
  const [exploded, setExploded] = useState(0);
  const [layers, setLayers] = useState<string[]>([...LAYER_CATEGORIES]);
  const [selected, setSelected] = useState<string | null>('col-L2-0');
  const [showConflicts, setShowConflicts] = useState(true);
  const [glbStatus, setGlbStatus] = useState<'checking' | 'glb' | 'sample'>('checking');
  const [glbFailed, setGlbFailed] = useState(false);
  const [sectionAt, setSectionAt] = useState(2);
  const [pending, setPending] = useState<THREE.Vector3 | null>(null);
  const [measures, setMeasures] = useState<Measure[]>([]);
  const [revTab, setRevTab] = useState('v2v3');

  useEffect(() => {
    let cancelled = false;
    probeModel(MODEL_URL).then((s) => { if (!cancelled) setGlbStatus(s); });
    return () => { cancelled = true; };
  }, []);

  // Sample-tower-only controls are disabled when a real GLB is loaded.
  const hasGlb = glbStatus === 'glb' && !glbFailed;
  const towerMode = !hasGlb;
  const focusFloor = Math.min(Math.max(FLOOR_LABELS.slice(2, 8).indexOf(floor), 0), 4);

  const clip = useMemo(
    () => (tool === 'section' ? [new THREE.Plane(new THREE.Vector3(-1, 0, 0), sectionAt)] : []),
    [tool, sectionAt]
  );

  const toggleLayer = (l: string) => setLayers((s) => (s.includes(l) ? s.filter((x) => x !== l) : [...s, l]));

  const addPoint = (p: THREE.Vector3) => {
    if (!pending) setPending(p);
    else {
      setMeasures((m) => [...m, { id: `ms-${Date.now()}`, a: pending, b: p }]);
      setPending(null);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-4">
      <Card className="xl:col-span-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>3D Model Workspace {projectId ? `— ${projectId}` : ''}</CardTitle>
          {glbStatus === 'checking'
            ? <Badge tone="medium">locating model…</Badge>
            : <Badge tone={hasGlb ? 'low' : 'medium'}>{hasGlb ? 'GLB live' : 'sample tower (upload .glb to /public/models/sample.glb)'}</Badge>}
          {showConflicts && <Badge tone="critical">1 critical clash visible (red)</Badge>}
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span className="font-semibold">Floor:</span>
          {FLOOR_LABELS.slice(2, 8).map((f) => (
            <button key={f} disabled={!towerMode} title={towerMode ? `Focus ${f}` : 'Sample-tower only'}
              onClick={() => setFloor(f)} className={`rounded-md px-2 py-1 ${floor === f ? 'bg-inverse text-on-inverse' : 'bg-surface-3'} disabled:opacity-40`}>{f}</button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button size="sm" variant={tool === 'orbit' ? 'default' : 'outline'} onClick={() => setTool('orbit')}><MousePointerClick className="h-4 w-4" /> Orbit</Button>
          <Button size="sm" variant={tool === 'measure' ? 'default' : 'outline'} onClick={() => setTool('measure')}><Ruler className="h-4 w-4" /> Measure {pending ? '(1st point set — click 2nd)' : ''}</Button>
          <Button size="sm" variant={tool === 'section' ? 'default' : 'outline'} disabled={!towerMode} title={towerMode ? 'Section cut' : 'Sample-tower only'} onClick={() => setTool('section')}><Slice className="h-4 w-4" /> Section</Button>
          {tool === 'section' && towerMode && (
            <label className="flex items-center gap-2 text-xs">Cut X <input type="range" min={-5} max={5} step={0.2} value={sectionAt} onChange={(e) => setSectionAt(+e.target.value)} /> {sectionAt.toFixed(1)}m</label>
          )}
          <label className={`flex items-center gap-2 text-xs ${!towerMode ? 'opacity-40' : ''}`} title={towerMode ? 'Explode view' : 'Sample-tower only'}>Explode <input type="range" min={0} max={100} disabled={!towerMode} value={exploded * 100} onChange={(e) => setExploded(+e.target.value / 100)} /></label>
          <Button size="sm" variant="outline" disabled={!towerMode} title={towerMode ? 'Toggle clash marker' : 'Sample-tower only'} onClick={() => setShowConflicts(!showConflicts)}>{showConflicts ? 'Hide' : 'Show'} conflicts</Button>
          {measures.length > 0 && <Button size="sm" variant="ghost" onClick={() => { setMeasures([]); setPending(null); }}><Trash2 className="h-4 w-4" /> Clear ({measures.length})</Button>}
        </div>
        {hasGlb && <p className="mt-2 text-xs text-text-muted">Viewing loaded GLB — layer, floor, section and explode controls apply to the sample tower only.</p>}
        <div className="mt-3 h-[480px] overflow-hidden rounded-xl bg-gradient-to-b from-surface-2 to-surface-3">
          <ErrorBoundary>
            <Suspense fallback={<div className="p-6 text-sm">Loading 3D…</div>}>
              <Canvas camera={{ position: [14, 10, 14], fov: 45 }} onCreated={({ gl }) => { gl.localClippingEnabled = true; }}>
                <ambientLight intensity={0.7} />
                <directionalLight position={[10, 14, 8]} intensity={1.1} />
                {hasGlb ? (
                  <GlbGuard onFail={() => setGlbFailed(true)}>
                    <GltfModel url={MODEL_URL} />
                  </GlbGuard>
                ) : (
                  <Tower exploded={exploded} selected={selected} onSelect={setSelected} clip={clip} layers={layers} focusFloor={focusFloor} showConflicts={showConflicts} />
                )}
                <MeasureLayer active={tool === 'measure'} measures={measures} onAdd={addPoint} />
                <Grid infiniteGrid sectionColor="#94a3b8" cellColor="#cbd5e1" />
                <OrbitControls makeDefault />
              </Canvas>
            </Suspense>
          </ErrorBoundary>
        </div>
        <p className="mt-2 text-xs text-text-muted">
          Orbit • Pan • Zoom. Measure: click two ground points for live distance. Section: drag cut plane (X). GLTF auto-loads when present at {MODEL_URL}.
        </p>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardTitle><span className="flex items-center gap-2"><Layers className="h-4 w-4" /> Layers ({layers.length}/{LAYER_CATEGORIES.length})</span></CardTitle>
          <div className="mt-2 space-y-1">
            {LAYER_CATEGORIES.map((l) => (
              <label key={l} className={`flex items-center gap-2 text-sm ${!towerMode ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}>
                <input type="checkbox" disabled={!towerMode} checked={layers.includes(l)} onChange={() => toggleLayer(l)} /> {l}
              </label>
            ))}
          </div>
        </Card>
        <Card>
          <CardTitle>Element inspector</CardTitle>
          {selected ? (
            <div className="mt-2 text-sm">
              <p className="font-mono font-semibold">{selected}</p>
              <p className="text-text-muted">M25 • Fe550 • 500×300 • 6.2 m • Floor {floor}</p>
              <div className="mt-2 flex flex-col gap-2">
                <Button size="sm" variant="outline" onClick={() => navigate('/takeoff')}>Quantity: 2.4 m³</Button>
                <Button size="sm" variant="outline" onClick={() => navigate('/boq')}>BOQ 4.2.3 → ₹18,400</Button>
                <Button size="sm" variant="outline" onClick={() => navigate('/schedule')}>Activity SCH-118 (55%)</Button>
              </div>
            </div>
          ) : <p className="text-sm text-text-muted">Click an element in the canvas.</p>}
        </Card>
        <Card>
          <CardTitle>Measurements</CardTitle>
          {measures.length === 0 ? <p className="mt-1 text-xs text-text-muted">None yet — use the Measure tool.</p> : (
            <ul className="mt-2 space-y-1 text-xs">
              {measures.map((m, i) => <li key={m.id}>M{i + 1}: <b>{m.a.distanceTo(m.b).toFixed(2)} m</b></li>)}
            </ul>
          )}
        </Card>
        <Card>
          <CardTitle>Revision compare</CardTitle>
          <Tabs tabs={[{ key: 'v2v3', label: 'V2→V3' }, { key: 'v1v2', label: 'V1→V2' }]} active={revTab} onChange={setRevTab} />
          <p className="mt-2 text-xs text-text-muted">
            {revTab === 'v2v3'
              ? '+6 added (green) • −2 removed (red) • ~4 modified (amber).'
              : '+14 added • −6 removed • ~22 modified. Cost +₹8.4L, schedule +4d.'}
          </p>
        </Card>
      </div>
    </div>
  );
}
