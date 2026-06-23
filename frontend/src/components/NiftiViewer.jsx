import { useEffect, useRef, useState } from "react";
import { DRAG_MODE, Niivue, SHOW_RENDER, SLICE_TYPE } from "@niivue/niivue";

const sliceOptions = [
  { label: "Axial", value: SLICE_TYPE.AXIAL, icon: "fa-square", tooltip: "Axial Slice View" },
  { label: "Coronal", value: SLICE_TYPE.CORONAL, icon: "fa-border-all", tooltip: "Coronal Slice View" },
  { label: "Sagittal", value: SLICE_TYPE.SAGITTAL, icon: "fa-columns", tooltip: "Sagittal Slice View" },
  { label: "MPR", value: SLICE_TYPE.MULTIPLANAR, icon: "fa-th-large", tooltip: "Multiplanar Reconstruction" },
  { label: "3D", value: SLICE_TYPE.RENDER, icon: "fa-cube", tooltip: "3D Volume Render" },
];

const colormapOptions = [
  { label: "Grayscale", value: "gray" },
  { label: "Viridis", value: "viridis" },
  { label: "Thermal", value: "hot" },
  { label: "Cool", value: "cool" },
  { label: "Jet", value: "jet" },
  { label: "Bone", value: "bone" },
];

const dragModeOptions = [
  { label: "Navigate", value: DRAG_MODE.pan, icon: "fa-hand-paper" },
  { label: "Contrast", value: DRAG_MODE.contrast, icon: "fa-adjust" },
  { label: "Measure", value: DRAG_MODE.measurement, icon: "fa-ruler" },
];

function NiftiViewer({ artifact, placeholder }) {
  const canvasRef = useRef(null);
  const niivueRef = useRef(null);

  const volumes = artifact?.niftiVolumes || [];
  const examples = artifact?.examples || [];
  const artifactId = artifact?.id || "";

  /* Media view */
  const [mediaView, setMediaView] = useState(() => {
    return volumes.length > 0 ? "volume" : "images";
  });

  /* Viewer state */
  const [loadedArtifactId, setLoadedArtifactId] = useState(artifactId);
  const [activeVolumeIndex, setActiveVolumeIndex] = useState(0);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [sliceType, setSliceType] = useState(SLICE_TYPE.MULTIPLANAR);
  const [dragMode, setDragMode] = useState(DRAG_MODE.pan);
  const [colormap, setColormap] = useState("gray");
  const [crosshairWidth, setCrosshairWidth] = useState(1);
  const [locationText, setLocationText] = useState("");
  const [viewerError, setViewerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const safeActiveVolumeIndex = volumes[activeVolumeIndex] ? activeVolumeIndex : 0;
  const activeVolume = volumes[safeActiveVolumeIndex];
  const activeVolumeName = activeVolume?.niivueName || activeVolume?.name || "AURA volume";
  const activeVolumeUrl = activeVolume?.url || "";
  const activeImage = examples[activeImageIndex];

  if (loadedArtifactId !== artifactId) {
    setLoadedArtifactId(artifactId);
    setMediaView(volumes.length > 0 ? "volume" : "images");
    setActiveVolumeIndex(0);
    setActiveImageIndex(0);
    setSliceType(SLICE_TYPE.MULTIPLANAR);
    setDragMode(DRAG_MODE.pan);
    setColormap("gray");
    setCrosshairWidth(1);
    setLocationText("");
    setViewerError("");
    setIsLoading(false);
  }

  /* Set up NiiVue */
  useEffect(() => {
    if (!canvasRef.current || !activeVolumeUrl || mediaView !== "volume") {
      return undefined;
    }

    let isActive = true;
    const niivue = new Niivue({
      backColor: [0.02, 0.04, 0.08, 1],
      crosshairColor: [0, 0.72, 1, 0.8],
      isOrientCube: true,
      show3Dcrosshair: true,
      textHeight: 0.03,
      onLocationChange: (data) => {
        if (isActive) {
          setLocationText(data?.string || "");
        }
      },
    });

    niivueRef.current = niivue;

    async function loadVolume() {
      if (isActive) {
        setIsLoading(true);
      }

      try {
        await niivue.attachToCanvas(canvasRef.current);
        niivue.opts.dragMode = DRAG_MODE.pan;
        niivue.opts.multiplanarShowRender = SHOW_RENDER.AUTO;
        niivue.setSliceType(SLICE_TYPE.MULTIPLANAR);
        niivue.setCrosshairWidth(1);
        await niivue.loadVolumes([
          {
            name: activeVolumeName,
            url: activeVolumeUrl,
            colormap: "gray",
          },
        ]);
        if (isActive) {
          setViewerError("");
          setIsLoading(false);
        }
      } catch (error) {
        if (isActive) {
          setViewerError(error?.message || "Unable to load this NIfTI volume.");
          setIsLoading(false);
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
  }, [activeVolumeName, activeVolumeUrl, mediaView]);

  /* Update viewer options */
  useEffect(() => {
    if (niivueRef.current && mediaView === "volume") {
      niivueRef.current.opts.dragMode = dragMode;
    }
  }, [dragMode, mediaView]);

  useEffect(() => {
    if (niivueRef.current && niivueRef.current.volumes.length > 0 && mediaView === "volume") {
      niivueRef.current.setColormap(niivueRef.current.volumes[0].id, colormap);
    }
  }, [colormap, mediaView]);

  useEffect(() => {
    if (niivueRef.current && mediaView === "volume") {
      niivueRef.current.setCrosshairWidth(crosshairWidth);
    }
  }, [crosshairWidth, mediaView]);

  const handleSliceType = (nextSliceType) => {
    setSliceType(nextSliceType);
    niivueRef.current?.setSliceType(nextSliceType);
  };

  const handleReset = () => {
    if (niivueRef.current && mediaView === "volume") {
      niivueRef.current.setDefaults({
        backColor: [0.02, 0.04, 0.08, 1],
        crosshairColor: [0, 0.72, 1, 0.8],
        isOrientCube: true,
        show3Dcrosshair: true,
        textHeight: 0.03,
      }, true);

      niivueRef.current.clearAllMeasurements();

      niivueRef.current.setSliceType(SLICE_TYPE.MULTIPLANAR);
      niivueRef.current.opts.dragMode = DRAG_MODE.pan;
      niivueRef.current.setCrosshairWidth(1);

      niivueRef.current.drawScene();

      setSliceType(SLICE_TYPE.MULTIPLANAR);
      setDragMode(DRAG_MODE.pan);
      setColormap("gray");
      setCrosshairWidth(1);
    }
  };

  const toggleCrosshairs = () => {
    setCrosshairWidth(prev => (prev === 0 ? 1 : 0));
  };

  /* Empty state */
  if (volumes.length === 0 && examples.length === 0) {
    return (
      <div className="flex flex-1 h-full min-h-[26rem] flex-col items-center justify-center bg-[#020612]">
        <div className="flex flex-col items-center gap-3 animate-subtle-pulse">
          <i className="fas fa-cube text-3xl text-slate-500"></i>
          <p className="text-sm font-semibold text-slate-400 tracking-wide">No media available</p>
        </div>
      </div>
    );
  }

  /* Viewer */
  return (
    <div className="relative flex flex-1 h-full flex-col overflow-hidden bg-[#020612]">
      <div className="flex flex-col gap-3 border-b border-white/10 bg-[#06101f]/95 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
          {volumes.length > 0 && (
            <div className="flex rounded-xl border border-white/10 bg-slate-950 p-0.5">
              <button
                onClick={() => setMediaView("images")}
                className={`rounded-[9px] px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  mediaView === "images"
                    ? "bg-brand-500 text-white"
                    : "text-slate-200 hover:text-white hover:bg-white/10"
                }`}
                type="button"
              >
                <i className="fas fa-image mr-1.5 text-xs"></i>2D
              </button>
              <button
                onClick={() => setMediaView("volume")}
                className={`rounded-[9px] px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  mediaView === "volume"
                    ? "bg-brand-500 text-white"
                    : "text-slate-200 hover:text-white hover:bg-white/10"
                }`}
                type="button"
              >
                <i className="fas fa-cube mr-1.5 text-xs"></i>3D
              </button>
            </div>
          )}

          {mediaView === "volume" && volumes.length > 1 && (
            <div className="relative">
              <select
                className="appearance-none rounded-xl border border-white/10 bg-slate-950 py-2 pl-3 pr-8 text-xs font-bold uppercase text-slate-100 outline-none cursor-pointer hover:text-white focus:border-brand-500"
                onChange={(event) => setActiveVolumeIndex(Number(event.target.value))}
                value={safeActiveVolumeIndex}
              >
                {volumes.map((volume, index) => (
                  <option key={`${volume.url}-${index}`} value={index} className="bg-slate-950 text-white">
                    {volume.name || `Vol ${index + 1}`}
                  </option>
                ))}
              </select>
              <i className="fas fa-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-300"></i>
            </div>
          )}
        </div>

          <div className="flex items-center gap-2">
          {mediaView === "volume" && locationText && (
            <div className="hidden max-w-[240px] rounded-xl border border-white/10 bg-slate-950 px-3 py-2 sm:block">
              <p className="truncate text-xs font-mono font-semibold text-cyan-300">{locationText}</p>
            </div>
          )}

          {mediaView === "volume" && (
            <button
              onClick={handleReset}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-slate-950 text-slate-200 transition-colors hover:bg-slate-800 hover:text-white cursor-pointer"
              title="Reset view parameters"
              type="button"
            >
              <i className="fas fa-undo text-xs"></i>
            </button>
          )}
          </div>
        </div>
      </div>

      <div className="relative flex-grow flex-1 flex items-center justify-center min-h-[26rem] h-full overflow-hidden">

        {mediaView === "volume" ? (
          <>
            {isLoading && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#020612]">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-10 h-10 rounded-full border-2 border-slate-700 border-t-cyan-500 animate-spin"></div>
                  <p className="text-xs font-semibold text-slate-400 tracking-wide">Loading volume…</p>
                </div>
              </div>
            )}

            {viewerError && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#020612]/95 p-6 text-center">
                <div className="viewer-toolbar p-6 flex flex-col items-center gap-3 max-w-xs bg-slate-900 border border-white/20">
                  <i className="fas fa-exclamation-triangle text-rose-400 text-2xl"></i>
                  <p className="text-xs font-semibold text-slate-200 leading-relaxed">{viewerError}</p>
                </div>
              </div>
            )}

            <canvas className="absolute inset-0 h-full w-full cursor-crosshair" ref={canvasRef} />
          </>
        ) : (
          <div className="absolute inset-0 w-full h-full flex items-center justify-center">
            {!activeImage ? (
              <div className="flex flex-col items-center justify-center text-slate-500 gap-3">
                {placeholder}
                <i className="fas fa-brain text-4xl opacity-30"></i>
                <p className="text-xs font-medium text-slate-400">No image available</p>
              </div>
            ) : (
              <img
                key={activeImageIndex}
                src={activeImage}
                alt={artifact?.name}
                className="w-full h-full object-contain select-none animate-crossfade p-2"
              />
            )}

            {examples.length > 1 && (
              <div className="absolute top-3 right-3 viewer-toolbar px-2.5 py-1 z-10 shadow-md bg-slate-900 border border-white/20">
                <span className="text-xs font-bold text-slate-100 tabular-nums">
                  {activeImageIndex + 1}<span className="text-slate-400 mx-0.5">/</span>{examples.length}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {mediaView === "volume" && (
        <div className="border-t border-white/10 bg-[#06101f]/95 p-3">
          <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-950 p-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1">
              {sliceOptions.map((option) => {
                const isActive = sliceType === option.value;
                return (
                  <button
                    key={option.label}
                    onClick={() => handleSliceType(option.value)}
                    className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-bold transition-colors cursor-pointer ${
                      isActive
                        ? "bg-brand-600 text-white"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                    title={option.tooltip}
                    type="button"
                  >
                    <i className={`fas ${option.icon} text-xs`}></i>
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                className="min-h-9 rounded-lg border border-white/10 bg-[#06101f] px-2.5 text-xs font-bold text-white outline-none cursor-pointer focus:border-brand-500"
                onChange={(e) => setColormap(e.target.value)}
                value={colormap}
              >
                {colormapOptions.map((cmap) => (
                  <option key={cmap.value} value={cmap.value} className="bg-slate-950 text-white">
                    {cmap.label}
                  </option>
                ))}
              </select>

              <select
                className="min-h-9 rounded-lg border border-white/10 bg-[#06101f] px-2.5 text-xs font-bold text-white outline-none cursor-pointer focus:border-brand-500"
                onChange={(e) => setDragMode(Number(e.target.value))}
                value={dragMode}
              >
                {dragModeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-slate-950 text-white">
                    {opt.label}
                  </option>
                ))}
              </select>

              <button
                onClick={toggleCrosshairs}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-bold transition-colors cursor-pointer ${
                  crosshairWidth > 0
                    ? "border-cyan-500/30 bg-cyan-500/20 text-cyan-200"
                    : "border-white/10 bg-[#06101f] text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
                type="button"
              >
                <i className="fas fa-crosshairs text-xs"></i>
                Crosshairs
              </button>
            </div>
          </div>
        </div>
      )}

      {mediaView !== "volume" && (
        examples.length > 1 && (
          <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-center pointer-events-none">
            <div className="viewer-toolbar px-2 py-1.5 flex gap-1.5 overflow-x-auto viewer-scroll pointer-events-auto max-w-[90%] sm:max-w-max shadow-lg bg-slate-900 border border-white/20">
              {examples.map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-9 h-9 rounded-lg flex-shrink-0 cursor-pointer border-2 transition-all duration-200 overflow-hidden ${
                    activeImageIndex === idx
                      ? "border-brand-500 shadow-md shadow-brand-500/20 scale-105"
                      : "border-transparent hover:border-white/20 opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )
      )}

    </div>
  );
}

export default NiftiViewer;
