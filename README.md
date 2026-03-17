# AURA Platform

**Artifact User Repository for Perfusion Imaging**

## 🚀 Overview

AURA aims to transform a static spreadsheet of perfusion imaging artifacts into an interactive, searchable, and image-centric web platform.

Perfusion MRI data often contains artifacts that are difficult to identify and interpret. Currently, artifact knowledge is scattered and lacks structured exploration.

This project proposes a scalable system where researchers and clinicians can:

* Search artifacts based on visual patterns
* Explore example images
* Understand causes and remedies
* Navigate artifacts across techniques (ASL, DSC, DCE, IVIM)

---

## 🧩 Problem Statement

The current system (Google Sheets) has several limitations:

* ❌ No efficient search or filtering
* ❌ No image-based exploration
* ❌ Poor scalability
* ❌ Difficult to integrate with QC tools

---

## 💡 Proposed Solution

A full-stack platform with:

* 🔍 Smart search & filtering
* 🖼️ Image gallery for artifact exploration
* 🧠 Structured artifact metadata
* 🔗 Future integration with QC outputs

---

## 🏗️ Architecture

Frontend (React / Next.js)
↓
Backend API (FastAPI)
↓
Database (PostgreSQL)
↓
Image Storage (Cloud / Local)

---

## 🗂️ Data Model

Each artifact includes:

* Artifact Name
* Alternative Names
* Category (e.g., B0, Ghosting)
* Description
* Explanation
* Remedies
* Helpful (Yes/No)
* Example Images
* References

---

## 🧪 Initial Plan

### Phase 1

* Convert Excel → JSON
* Build backend APIs
* Basic frontend UI

### Phase 2

* Advanced filtering
* Image viewer
* Artifact comparison

### Phase 3

* QC tool integration
* User contributions

---

## ⚙️ Tech Stack

* Frontend: React (Next.js)
* Backend: FastAPI
* Database: PostgreSQL
* Storage: AWS S3 / Local

---

## 📌 Current Status

🚧 Initial architecture and planning phase
🔜 Prototype implementation in progress

---

## 🤝 Contributions

Open to ideas and feedback from the OSIPI community.
