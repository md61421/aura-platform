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

  const exampleSlices = artifact?.exampleSlices || examples.map((url, idx) => ({
    url,
    index: idx + 1,
    filename: `slice-${idx + 1}`,
    view: "axial",
    isKeySlice: idx === 0,
  }));

  /* MRI View Filtering */
  const [activeViewFilter, setActiveViewFilter] = useState("all");
  const [showOnlyKeySlices, setShowOnlyKeySlices] = useState(false);

  const availableViews = Array.from(
    new Set(exampleSlices.map((s) => (s.view || "axial").toLowerCase()))
  ).filter(Boolean);

  const baseViewSlices = activeViewFilter === "all"
    ? exampleSlices
    : exampleSlices.filter((s) => (s.view || "axial").toLowerCase() === activeViewFilter);

  const displaySlices = showOnlyKeySlices
    ? baseViewSlices.filter((s) => s.isKeySlice)
    : baseViewSlices;

  const totalKeySlicesCount = exampleSlices.filter((s) => s.isKeySlice).length;

  /* Magnifying Loupe Glass State */
  const [magnifyEnabled, setMagnifyEnabled] = useState(false);
  const [magnifyPos, setMagnifyPos] = useState({ x: 0, y: 0, relX: 0, relY: 0, w: 0, h: 0 });
  const [isHoveringSlice, setIsHoveringSlice] = useState(false);
  const sliceImgRef = useRef(null);

  const handleSliceMouseMove = (e) => {
    if (!magnifyEnabled || !sliceImgRef.current) return;
    const rect = sliceImgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
      setIsHoveringSlice(true);
      setMagnifyPos({
        x: e.clientX,
        y: e.clientY,
        relX: x / rect.width,
        relY: y / rect.height,
        w: rect.width,
        h: rect.height,
      });
    } else {
      setIsHoveringSlice(false);
    }
  };

  /* Media view: "images" | "montage" | "volume" */
  const [mediaView, setMediaView] = useState(() => {
    return volumes.length > 0 ? "volume" : "images";
  });
  const [activeMontagePlane, setActiveMontagePlane] = useState("axial");

  const montages = artifact?.montages || { axial: null, coronal: null, sagittal: null };

  /* Viewer state */
  const [loadedArtifactId, setLoadedArtifactId] = useState(artifactId);
  const [activeVolumeIndex, setActiveVolumeIndex] = useState(0);
  const [activeImageIndex, setActiveImageIndex] = useState(() => {
    const keyIdx = exampleSlices.findIndex((s) => s.isKeySlice);
    if (keyIdx >= 0) return keyIdx;
    if (exampleSlices.length > 2) return Math.floor(exampleSlices.length / 2);
    return 0;
  });
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

  const safeActiveImageIndex = displaySlices[activeImageIndex] ? activeImageIndex : 0;
  const currentSlice = displaySlices[safeActiveImageIndex] || {
    url: examples[0] || "",
    view: "axial",
    isKeySlice: false,
  };
  const activeImage = currentSlice.url || examples[safeActiveImageIndex] || "";

  if (loadedArtifactId !== artifactId) {
    const keyIdx = exampleSlices.findIndex((s) => s.isKeySlice);
    const initialIndex = keyIdx >= 0 ? keyIdx : (exampleSlices.length > 2 ? Math.floor(exampleSlices.length / 2) : 0);
    setLoadedArtifactId(artifactId);
    setMediaView(volumes.length > 0 ? "volume" : "images");
    setActiveVolumeIndex(0);
    setActiveImageIndex(initialIndex);
    setActiveViewFilter("all");
    setSliceType(SLICE_TYPE.MULTIPLANAR);
    setDragMode(DRAG_MODE.pan);
    setColormap("gray");
    setCrosshairWidth(1);
    setLocationText("");
    setViewerError("");
    setIsLoading(false);
  }

  /* Set up 3D NiiVue */
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

  /* 3D Option Updates */
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

  /* Simple 2D Keyboard Navigation */
  useEffect(() => {
    if (mediaView !== "images") return undefined;

    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : displaySlices.length - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setActiveImageIndex((prev) => (prev < displaySlices.length - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mediaView, displaySlices.length]);

  /* 2D Mouse Wheel Slice Scrubbing */
  const handleWheel2D = (e) => {
    if (mediaView !== "images" || displaySlices.length <= 1) return;
    if (e.deltaY > 0) {
      setActiveImageIndex((prev) => (prev < displaySlices.length - 1 ? prev + 1 : 0));
    } else if (e.deltaY < 0) {
      setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : displaySlices.length - 1));
    }
  };

  const handleSliceType = (nextSliceType) => {
    setSliceType(nextSliceType);
    niivueRef.current?.setSliceType(nextSliceType);
  };

  const handleReset3D = () => {
    if (niivueRef.current && mediaView === "volume") {
      niivueRef.current.setDefaults(
        {
          backColor: [0.02, 0.04, 0.08, 1],
          crosshairColor: [0, 0.72, 1, 0.8],
          isOrientCube: true,
          show3Dcrosshair: true,
          textHeight: 0.03,
        },
        true
      );

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
    setCrosshairWidth((prev) => (prev === 0 ? 1 : 0));
  };


  /* Empty state */
  if (volumes.length === 0 && exampleSlices.length === 0) {
    return (
      <div className="flex flex-1 h-full min-h-[26rem] flex-col items-center justify-center bg-[#020612]">
        <div className="flex flex-col items-center gap-3 animate-subtle-pulse">
          <i className="fas fa-cube text-3xl text-slate-500"></i>
          <p className="text-sm font-semibold text-slate-400 tracking-wide">No media available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 h-full flex-col overflow-hidden bg-[#020612] select-none">
      {/* Top Workstation Header Bar (Streamlined UX: Segmented Mode Selector & Contextual Tools) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 bg-slate-950 px-3.5 py-2.5 shadow-md">
        {/* Left: Primary View Mode Segmented Control (Always Shows Slices, Montages, 3D Engine) */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-slate-800 bg-slate-900/90 p-1 shadow-inner">
            {/* Slices Button */}
            <button
              type="button"
              onClick={() => exampleSlices.length > 0 && setMediaView("images")}
              disabled={exampleSlices.length === 0}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5 ${
                mediaView === "images"
                  ? "bg-brand-600 text-white shadow-sm font-extrabold"
                  : exampleSlices.length === 0
                  ? "text-slate-600 cursor-not-allowed opacity-40"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/80 cursor-pointer"
              }`}
              title={exampleSlices.length > 0 ? "2D Image Slices Mode" : "No 2D image slices available"}
            >
              <i className="fas fa-images text-xs"></i>
              <span>Slices</span>
            </button>

            {/* Montages Button */}
            <button
              type="button"
              onClick={() => {
                if (montages.axial || montages.coronal || montages.sagittal) {
                  const firstAvailable = montages.axial ? "axial" : montages.coronal ? "coronal" : "sagittal";
                  setActiveMontagePlane(firstAvailable);
                  setMediaView("montage");
                }
              }}
              disabled={!montages.axial && !montages.coronal && !montages.sagittal}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5 ${
                mediaView === "montage"
                  ? "bg-emerald-600 text-white shadow-sm font-extrabold"
                  : (!montages.axial && !montages.coronal && !montages.sagittal)
                  ? "text-slate-600 cursor-not-allowed opacity-40"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/80 cursor-pointer"
              }`}
              title={
                montages.axial || montages.coronal || montages.sagittal
                  ? "Full Volume Overview Montages"
                  : "No montages uploaded for this artifact"
              }
            >
              <i className="fas fa-th text-xs"></i>
              <span>Montages</span>
            </button>

            {/* 3D View Button */}
            <button
              type="button"
              onClick={() => volumes.length > 0 && setMediaView("volume")}
              disabled={volumes.length === 0}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5 ${
                mediaView === "volume"
                  ? "bg-brand-600 text-white shadow-sm font-extrabold"
                  : volumes.length === 0
                  ? "text-slate-600 cursor-not-allowed opacity-40"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/80 cursor-pointer"
              }`}
              title={volumes.length > 0 ? "3D NIfTI View" : "No 3D volume available for this artifact"}
            >
              <i className="fas fa-cube text-xs"></i>
              <span>3D View</span>
            </button>
          </div>
        </div>

        {/* Right: Contextual Tools Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {mediaView === "images" && (
            <>
              {/* Orientation Filter Tabs */}
              <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900/90 p-1 shadow-inner">
                <button
                  type="button"
                  onClick={() => {
                    setActiveViewFilter("all");
                    setActiveImageIndex(0);
                  }}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                    activeViewFilter === "all"
                      ? "bg-slate-800 text-white font-bold shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  All ({exampleSlices.length})
                </button>
                {availableViews.map((v) => {
                  const count = exampleSlices.filter((s) => (s.view || "axial").toLowerCase() === v).length;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        setActiveViewFilter(v);
                        setActiveImageIndex(0);
                      }}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-all cursor-pointer ${
                        activeViewFilter === v
                          ? "bg-slate-800 text-white font-bold shadow-xs"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {v} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Key Slices Toggle Pill */}
              {totalKeySlicesCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setShowOnlyKeySlices(!showOnlyKeySlices);
                    setActiveImageIndex(0);
                  }}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                    showOnlyKeySlices
                      ? "bg-cyan-500 text-slate-950 font-bold border border-cyan-400 shadow-sm"
                      : "bg-slate-900 border border-slate-800 text-cyan-400 hover:bg-slate-800"
                  }`}
                  title={showOnlyKeySlices ? "Show all slices" : "Filter Key Slices"}
                >
                  <i className={`fas fa-bookmark text-xs ${showOnlyKeySlices ? "text-slate-950" : "text-cyan-400"}`}></i>
                  <span>{showOnlyKeySlices ? `Key Slices (${displaySlices.length})` : `Key Slices (${totalKeySlicesCount})`}</span>
                </button>
              )}

              {/* Magnifier Toggle Pill */}
              <button
                type="button"
                onClick={() => setMagnifyEnabled(!magnifyEnabled)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                  magnifyEnabled
                    ? "bg-cyan-500 text-slate-950 font-bold border border-cyan-400 shadow-sm"
                    : "bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800"
                }`}
                title={magnifyEnabled ? "Disable Magnifier" : "Enable 1.5x Magnifying Glass"}
              >
                <i className="fas fa-search-plus text-xs"></i>
                <span>{magnifyEnabled ? "Magnifier Active" : "Magnifier"}</span>
              </button>
            </>
          )}

          {mediaView === "montage" && (
            <>
              {/* Montage Plane Selector Tabs */}
              <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900/90 p-1 shadow-inner">
                {[
                  { key: "axial", label: "Axial", icon: "fa-square" },
                  { key: "coronal", label: "Coronal", icon: "fa-border-all" },
                  { key: "sagittal", label: "Sagittal", icon: "fa-columns" },
                ].map((m) => {
                  const url = montages[m.key];
                  const isActive = activeMontagePlane === m.key;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => url && setActiveMontagePlane(m.key)}
                      disabled={!url}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        isActive
                          ? "bg-emerald-600 text-white font-extrabold shadow-sm"
                          : !url
                          ? "text-slate-600 cursor-not-allowed opacity-40"
                          : "text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
                      }`}
                      title={url ? `Display ${m.label} Montage` : `${m.label} montage not uploaded`}
                    >
                      <i className={`fas ${m.icon} text-[10px]`}></i>
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Magnifier Toggle Pill for Montage */}
              <button
                type="button"
                onClick={() => setMagnifyEnabled(!magnifyEnabled)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                  magnifyEnabled
                    ? "bg-cyan-500 text-slate-950 font-bold border border-cyan-400 shadow-sm"
                    : "bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800"
                }`}
                title={magnifyEnabled ? "Disable Magnifier" : "Enable 2.5x Magnifying Glass"}
              >
                <i className="fas fa-search-plus text-xs"></i>
                <span>{magnifyEnabled ? "Magnifier Active" : "Magnifier"}</span>
              </button>
            </>
          )}

          {mediaView === "volume" && (
            <>
              {volumes.length > 1 && (
                <div className="relative">
                  <select
                    className="appearance-none rounded-xl border border-white/10 bg-slate-950 py-1 pl-3 pr-7 text-xs font-bold uppercase text-slate-100 outline-none cursor-pointer hover:text-white focus:border-brand-500"
                    onChange={(event) => setActiveVolumeIndex(Number(event.target.value))}
                    value={safeActiveVolumeIndex}
                  >
                    {volumes.map((volume, index) => (
                      <option key={`${volume.url}-${index}`} value={index} className="bg-slate-950 text-white">
                        {volume.name || `Vol ${index + 1}`}
                      </option>
                    ))}
                  </select>
                  <i className="fas fa-chevron-down pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-300"></i>
                </div>
              )}

              {locationText && (
                <div className="hidden max-w-[200px] rounded-xl border border-white/10 bg-slate-950 px-2.5 py-1 sm:block">
                  <p className="truncate text-xs font-mono font-semibold text-cyan-300">{locationText}</p>
                </div>
              )}
              <button
                onClick={handleReset3D}
                className="flex h-7 px-2.5 items-center justify-center gap-1 rounded-xl border border-white/10 bg-slate-950 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-800 hover:text-white cursor-pointer"
                title="Reset 3D view parameters"
                type="button"
              >
                <i className="fas fa-undo text-xs"></i> Reset
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Display Area */}
      <div
        onWheel={handleWheel2D}
        className="relative flex-grow flex-1 flex items-center justify-center min-h-[26rem] h-full overflow-hidden"
      >
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
        ) : mediaView === "montage" ? (
          /* Whole Volume Montage Display */
          <div className="absolute inset-0 w-full h-full flex items-center justify-center p-4">
            {montages[activeMontagePlane] ? (
              <div
                className="relative w-full h-full flex items-center justify-center"
                onMouseMove={handleSliceMouseMove}
                onMouseLeave={() => setIsHoveringSlice(false)}
              >
                <img
                  ref={sliceImgRef}
                  src={montages[activeMontagePlane]}
                  alt={`${activeMontagePlane} Montage`}
                  className={`max-h-full max-w-full object-contain select-none shadow-2xl rounded p-2 animate-crossfade ${
                    magnifyEnabled ? "cursor-crosshair" : ""
                  }`}
                />
                <div className="absolute top-3 left-3 bg-slate-950/90 text-slate-100 border border-slate-700 text-xs font-medium px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-2 z-20 backdrop-blur-sm">
                  <span className="uppercase font-extrabold text-emerald-400">
                    Whole Volume {activeMontagePlane} Montage
                  </span>
                </div>

                {/* Floating 2.5x Magnifying Glass Loupe Overlay for Montage */}
                {magnifyEnabled && isHoveringSlice && montages[activeMontagePlane] && (
                  <div
                    className="fixed w-48 h-48 rounded-full border-2 border-cyan-400 shadow-2xl shadow-cyan-500/40 overflow-hidden pointer-events-none z-50 bg-slate-950/90"
                    style={{
                      left: magnifyPos.x - 96,
                      top: magnifyPos.y - 96,
                    }}
                  >
                    <div
                      className="absolute"
                      style={{
                        width: magnifyPos.w * 2.5,
                        height: magnifyPos.h * 2.5,
                        left: -(magnifyPos.relX * magnifyPos.w * 2.5 - 96),
                        top: -(magnifyPos.relY * magnifyPos.h * 2.5 - 96),
                      }}
                    >
                      <img
                        src={montages[activeMontagePlane]}
                        alt="Magnified Montage"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    {/* Precision Crosshair in Loupe Center */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-5 h-[1px] bg-cyan-400/90"></div>
                      <div className="h-5 w-[1px] bg-cyan-400/90 absolute"></div>
                      <div className="w-2.5 h-2.5 rounded-full border border-cyan-300 absolute"></div>
                    </div>
                    <span className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-slate-950/90 text-cyan-300 text-[9px] font-bold px-1.5 py-0.5 rounded border border-cyan-500/30">
                      2.5×
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-500 gap-3">
                <i className="fas fa-th text-4xl opacity-30"></i>
                <p className="text-xs font-medium text-slate-400">
                  No {activeMontagePlane} montage uploaded for this artifact
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Clean 2D Slice Image Display */
          <div className="absolute inset-0 w-full h-full flex items-center justify-center">
            {!activeImage ? (
              <div className="flex flex-col items-center justify-center text-slate-500 gap-3">
                {placeholder}
                <i className="fas fa-brain text-4xl opacity-30"></i>
                <p className="text-xs font-medium text-slate-400">No image available</p>
              </div>
            ) : (
              <div
                className="relative w-full h-full flex items-center justify-center p-4"
                onMouseMove={handleSliceMouseMove}
                onMouseLeave={() => setIsHoveringSlice(false)}
              >
                <img
                  ref={sliceImgRef}
                  key={safeActiveImageIndex}
                  src={activeImage}
                  alt={artifact?.name}
                  className={`max-h-full max-w-full object-contain select-none shadow-2xl rounded p-2 animate-crossfade ${
                    magnifyEnabled ? "cursor-crosshair" : ""
                  }`}
                />

                {/* Floating 1.5x Magnifying Glass Loupe Overlay */}
                {magnifyEnabled && isHoveringSlice && (
                  <div
                    className="fixed w-44 h-44 rounded-full border-2 border-cyan-400 shadow-2xl shadow-cyan-500/40 overflow-hidden pointer-events-none z-50 bg-slate-950/90"
                    style={{
                      left: magnifyPos.x - 88,
                      top: magnifyPos.y - 88,
                    }}
                  >
                    <div
                      className="absolute"
                      style={{
                        width: magnifyPos.w * 1.5,
                        height: magnifyPos.h * 1.5,
                        left: -(magnifyPos.relX * magnifyPos.w * 1.5 - 88),
                        top: -(magnifyPos.relY * magnifyPos.h * 1.5 - 88),
                      }}
                    >
                      <img
                        src={activeImage}
                        alt="Magnified View"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    {/* Precision Crosshair in Loupe Center */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-5 h-[1px] bg-cyan-400/90"></div>
                      <div className="h-5 w-[1px] bg-cyan-400/90 absolute"></div>
                      <div className="w-2.5 h-2.5 rounded-full border border-cyan-300 absolute"></div>
                    </div>
                    <span className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-slate-950/90 text-cyan-300 text-[9px] font-bold px-1.5 py-0.5 rounded border border-cyan-500/30">
                      1.5×
                    </span>
                  </div>
                )}

                {/* MRI View & Key Slice Badge Overlay */}
                <div className="absolute top-3 left-3 bg-slate-950/90 text-slate-100 border border-slate-700 text-xs font-medium px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-2 z-20 backdrop-blur-sm">
                  <span className="uppercase font-bold text-slate-200">
                    {currentSlice.view || "Axial"} View
                  </span>
                  {currentSlice.isKeySlice && showOnlyKeySlices && (
                    <span className="text-[10px] font-bold text-cyan-300 border-l border-slate-700 pl-2 flex items-center gap-1">
                      <i className="fas fa-bookmark text-cyan-400 text-[9px]"></i> Key Slice
                    </span>
                  )}
                </div>

                {/* Left/Right Arrow Navigation Overlays */}
                {displaySlices.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : displaySlices.length - 1))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-950/80 border border-white/20 text-white hover:bg-slate-900 flex items-center justify-center transition-transform active:scale-95 shadow-lg z-20"
                      title="Previous slice (← Key)"
                    >
                      <i className="fas fa-chevron-left text-sm"></i>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveImageIndex((prev) => (prev < displaySlices.length - 1 ? prev + 1 : 0))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-950/80 border border-white/20 text-white hover:bg-slate-900 flex items-center justify-center transition-transform active:scale-95 shadow-lg z-20"
                      title="Next slice (→ Key)"
                    >
                      <i className="fas fa-chevron-right text-sm"></i>
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Slice Counter Overlay */}
            {displaySlices.length > 1 && (
              <div className="absolute top-3 right-3 viewer-toolbar px-3 py-1 z-10 shadow-md bg-slate-950/90 border border-white/20 rounded-xl">
                <span className="text-xs font-bold text-slate-100 tabular-nums">
                  Slice {safeActiveImageIndex + 1}<span className="text-slate-400 mx-1">/</span>{displaySlices.length}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3D Bottom Control Toolbar */}
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

      {/* Clean 2D Combined Slider + Thumbnail Rail Toolbar */}
      {mediaView !== "volume" && displaySlices.length > 1 && (
        <div className="border-t border-white/10 bg-[#06101f]/95 p-3 z-20 flex flex-col gap-2.5">
          {/* Row 1: Range Slider & Counter */}
          <div className="flex items-center gap-3 max-w-3xl mx-auto w-full px-2">
            <button
              type="button"
              onClick={() => setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : displaySlices.length - 1))}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1"
              title="Previous Slice"
            >
              <i className="fas fa-chevron-left text-xs"></i>
            </button>

            <input
              type="range"
              min={0}
              max={displaySlices.length - 1}
              value={safeActiveImageIndex}
              onChange={(e) => setActiveImageIndex(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 accent-brand-500 rounded-lg cursor-pointer transition-all"
            />

            <button
              type="button"
              onClick={() => setActiveImageIndex((prev) => (prev < displaySlices.length - 1 ? prev + 1 : 0))}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1"
              title="Next Slice"
            >
              <i className="fas fa-chevron-right text-xs"></i>
            </button>

            <span className="text-xs font-semibold text-slate-300 tabular-nums whitespace-nowrap pl-1">
              Slice <strong className="text-white">{safeActiveImageIndex + 1}</strong> / {displaySlices.length}
            </span>
          </div>

          {/* Row 2: Thumbnail Rail */}
          <div className="flex items-center justify-center">
            <div className="viewer-toolbar px-2 py-1 flex gap-2 overflow-x-auto viewer-scroll max-w-full bg-slate-950/90 border border-white/10 rounded-xl">
              {displaySlices.map((slice, idx) => (
                <div
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-9 h-9 rounded-lg flex-shrink-0 cursor-pointer border-2 transition-all duration-200 overflow-hidden relative ${
                    safeActiveImageIndex === idx
                      ? "border-brand-500 ring-2 ring-brand-500/30 scale-105"
                      : slice.isKeySlice
                      ? "border-slate-500 opacity-90"
                      : "border-transparent hover:border-white/20 opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={slice.url} alt="" className="w-full h-full object-cover" />
                  {slice.isKeySlice && (
                    <span
                      className="absolute top-1 left-1 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-slate-950 shadow"
                      title="Key Slice"
                    />
                  )}
                  <span className="absolute bottom-0 right-0 bg-black/80 text-white text-[9px] font-bold px-1">
                    #{idx + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NiftiViewer;
