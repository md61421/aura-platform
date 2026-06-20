import { useEffect, useRef, useState } from "react";
import { DRAG_MODE, Niivue, SHOW_RENDER, SLICE_TYPE } from "@niivue/niivue";

const sliceOptions = [
  { label: "Axial", value: SLICE_TYPE.AXIAL },
  { label: "Coronal", value: SLICE_TYPE.CORONAL },
  { label: "Sagittal", value: SLICE_TYPE.SAGITTAL },
  { label: "MPR", value: SLICE_TYPE.MULTIPLANAR },
  { label: "3D", value: SLICE_TYPE.RENDER },
];

function NiftiViewer({ title, volumes = [] }) {
  const canvasRef = useRef(null);
  const niivueRef = useRef(null);
  const [activeVolumeIndex, setActiveVolumeIndex] = useState(0);
  const [sliceType, setSliceType] = useState(SLICE_TYPE.MULTIPLANAR);
  const [locationText, setLocationText] = useState("");
  const [viewerError, setViewerError] = useState("");

  const safeActiveVolumeIndex = volumes[activeVolumeIndex] ? activeVolumeIndex : 0;
  const activeVolume = volumes[safeActiveVolumeIndex];

  useEffect(() => {
    if (!canvasRef.current || !activeVolume?.url) {
      return undefined;
    }

    let isActive = true;
    const niivue = new Niivue({
      backColor: [0.04, 0.06, 0.1, 1],
      crosshairColor: [0.14, 0.82, 0.98, 1],
      isOrientCube: true,
      show3Dcrosshair: true,
      textHeight: 0.035,
      onLocationChange: (data) => {
        if (isActive) {
          setLocationText(data?.string || "");
        }
      },
    });

    niivueRef.current = niivue;

    async function loadVolume() {
      try {
        await niivue.attachToCanvas(canvasRef.current);
        niivue.opts.dragMode = DRAG_MODE.pan;
        niivue.opts.multiplanarShowRender = SHOW_RENDER.AUTO;
        niivue.setSliceType(sliceType);
        await niivue.loadVolumes([
          {
            name: activeVolume.niivueName,
            url: activeVolume.url,
            colormap: "gray",
          },
        ]);
        if (isActive) {
          setViewerError("");
        }
      } catch (error) {
        if (isActive) {
          setViewerError(error?.message || "Unable to load this NIfTI volume.");
        }
      }
    }

    loadVolume();

    return () => {
      isActive = false;
      niivue.cleanup();
      if (niivueRef.current === niivue) {
        niivueRef.current = null;
      }
    };
  }, [activeVolume, sliceType, title]);

  const handleSliceType = (nextSliceType) => {
    setSliceType(nextSliceType);
    niivueRef.current?.setSliceType(nextSliceType);
  };

  if (!volumes.length) {
    return (
      <div className="flex min-h-[24rem] flex-col items-center justify-center rounded-2xl bg-slate-900 text-slate-400">
        <i className="fas fa-cube text-4xl opacity-60"></i>
        <p className="mt-4 text-sm font-medium">No NIfTI volume available</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[28rem] flex-1 flex-col overflow-hidden rounded-2xl bg-slate-950 shadow-inner">
      <div className="flex flex-col gap-3 border-b border-white/10 bg-slate-900/90 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {activeVolume?.name || title || "AURA volume"}
          </p>
          <p className="truncate text-xs text-slate-400">
            {locationText || "Ready"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {volumes.length > 1 && (
            <select
              className="max-w-44 rounded-lg border border-white/10 bg-slate-800 px-2 py-1.5 text-xs font-medium text-slate-100 outline-none focus:border-brand-500"
              onChange={(event) => setActiveVolumeIndex(Number(event.target.value))}
              value={safeActiveVolumeIndex}
            >
              {volumes.map((volume, index) => (
                <option key={`${volume.url}-${index}`} value={index}>
                  {volume.name || `Volume ${index + 1}`}
                </option>
              ))}
            </select>
          )}

          <div className="flex rounded-lg border border-white/10 bg-slate-800 p-1">
            {sliceOptions.map((option) => (
              <button
                className={`rounded-md px-2 py-1 text-xs font-semibold transition-colors ${
                  sliceType === option.value
                    ? "bg-brand-500 text-white"
                    : "text-slate-300 hover:bg-slate-700"
                }`}
                key={option.label}
                onClick={() => handleSliceType(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative min-h-[24rem] flex-1">
        {viewerError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/95 p-6 text-center">
            <p className="max-w-sm text-sm font-medium text-rose-200">{viewerError}</p>
          </div>
        )}
        <canvas className="absolute inset-0 h-full w-full" ref={canvasRef} />
      </div>
    </div>
  );
}

export default NiftiViewer;
