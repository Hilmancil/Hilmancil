// ==========================================
// VIDEO SLIDESHOW GENERATOR - Main App
// ==========================================

class SlideshowGenerator {
    constructor() {
        this.images = [];
        this.audioFile = null;
        this.isPreviewPlaying = false;
        this.previewInterval = null;
        this.currentSlide = 0;

        this.initElements();
        this.initEvents();
    }

    initElements() {
        // DOM Elements
        this.dropZone = document.getElementById('dropZone');
        this.imageInput = document.getElementById('imageInput');
        this.imagePreview = document.getElementById('imagePreview');
        this.slideText = document.getElementById('slideText');
        this.fontSelect = document.getElementById('fontSelect');
        this.fontSize = document.getElementById('fontSize');
        this.fontColor = document.getElementById('fontColor');
        this.textPosition = document.getElementById('textPosition');
        this.musicInput = document.getElementById('musicInput');
        this.musicPlayer = document.getElementById('musicPlayer');
        this.audioPreview = document.getElementById('audioPreview');
        this.removeMusic = document.getElementById('removeMusic');
        this.slideDuration = document.getElementById('slideDuration');
        this.durationValue = document.getElementById('durationValue');
        this.transition = document.getElementById('transition');
        this.videoResolution = document.getElementById('videoResolution');
        this.canvas = document.getElementById('previewCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.btnPreview = document.getElementById('btnPreview');
        this.btnGenerate = document.getElementById('btnGenerate');
        this.progressBar = document.getElementById('progressBar');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.downloadSection = document.getElementById('downloadSection');
        this.downloadLink = document.getElementById('downloadLink');
    }

    initEvents() {
        // Drag & Drop
        this.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dropZone.classList.add('dragover');
        });
        this.dropZone.addEventListener('dragleave', () => {
            this.dropZone.classList.remove('dragover');
        });
        this.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dropZone.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });
        this.dropZone.addEventListener('click', () => this.imageInput.click());

        // File Input
        this.imageInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });

        // Music
        this.musicInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.audioFile = e.target.files[0];
                this.audioPreview.src = URL.createObjectURL(this.audioFile);
                this.musicPlayer.style.display = 'flex';
            }
        });
        this.removeMusic.addEventListener('click', () => {
            this.audioFile = null;
            this.audioPreview.src = '';
            this.musicPlayer.style.display = 'none';
            this.musicInput.value = '';
        });

        // Duration slider
        this.slideDuration.addEventListener('input', (e) => {
            this.durationValue.textContent = e.target.value + ' detik';
        });

        // Preview & Generate
        this.btnPreview.addEventListener('click', () => this.togglePreview());
        this.btnGenerate.addEventListener('click', () => this.generateVideo());
    }

    handleFiles(files) {
        const maxImages = 20;
        for (let file of files) {
            if (this.images.length >= maxImages) break;
            if (!file.type.startsWith('image/')) continue;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                this.images.push({
                    src: e.target.result,
                    file: file
                });
                this.renderImagePreviews();
            };
            reader.readAsDataURL(file);
        }
    }

    renderImagePreviews() {
        this.imagePreview.innerHTML = '';
        this.images.forEach((img, index) => {
            const thumb = document.createElement('div');
            thumb.className = 'thumb';
            thumb.innerHTML = `
                <img src="${img.src}" alt="Slide ${index + 1}">
                <button class="remove-img" data-index="${index}">&times;</button>
                <span class="slide-num">${index + 1}</span>
            `;
            this.imagePreview.appendChild(thumb);
        });

        // Remove button events
        document.querySelectorAll('.remove-img').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.index);
                this.images.splice(idx, 1);
                this.renderImagePreviews();
            });
        });
    }

    getTexts() {
        const text = this.slideText.value.trim();
        if (!text) return [];
        return text.split('\n');
    }

    drawSlide(imageObj, text, opacity = 1) {
        const res = parseInt(this.videoResolution.value);
        const width = res === 1080 ? 1920 : 1280;
        const height = res === 1080 ? 1080 : 720;
        
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx.clearRect(0, 0, width, height);

        // Draw background black
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, width, height);

        // Draw image (cover fit)
        if (imageObj) {
            this.ctx.globalAlpha = opacity;
            const img = imageObj;
            const imgRatio = img.width / img.height;
            const canvasRatio = width / height;
            let drawW, drawH, drawX, drawY;

            if (imgRatio > canvasRatio) {
                drawH = height;
                drawW = height * imgRatio;
                drawX = (width - drawW) / 2;
                drawY = 0;
            } else {
                drawW = width;
                drawH = width / imgRatio;
                drawX = 0;
                drawY = (height - drawH) / 2;
            }
            this.ctx.drawImage(img, drawX, drawY, drawW, drawH);
            this.ctx.globalAlpha = 1;
        }

        // Draw text
        if (text) {
            const size = parseInt(this.fontSize.value);
            const font = this.fontSelect.value;
            const color = this.fontColor.value;
            const position = this.textPosition.value;

            this.ctx.font = `bold ${size}px ${font}`;
            this.ctx.fillStyle = color;
            this.ctx.textAlign = 'center';
            this.ctx.shadowColor = 'rgba(0,0,0,0.8)';
            this.ctx.shadowBlur = 8;
            this.ctx.shadowOffsetX = 2;
            this.ctx.shadowOffsetY = 2;

            let y;
            if (position === 'top') y = size + 40;
            else if (position === 'center') y = height / 2;
            else y = height - 60;

            // Word wrap
            const words = text.split(' ');
            const lines = [];
            let currentLine = '';
            const maxWidth = width - 100;

            for (let word of words) {
                const testLine = currentLine + word + ' ';
                const metrics = this.ctx.measureText(testLine);
                if (metrics.width > maxWidth && currentLine !== '') {
                    lines.push(currentLine.trim());
                    currentLine = word + ' ';
                } else {
                    currentLine = testLine;
                }
            }
            lines.push(currentLine.trim());

            const lineHeight = size * 1.3;
            const startY = y - ((lines.length - 1) * lineHeight) / 2;

            lines.forEach((line, i) => {
                this.ctx.fillText(line, width / 2, startY + i * lineHeight);
            });

            // Reset shadow
            this.ctx.shadowColor = 'transparent';
            this.ctx.shadowBlur = 0;
        }
    }

    async loadImage(src) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = src;
        });
    }

    async togglePreview() {
        if (this.images.length === 0) {
            alert('Silakan upload minimal 1 gambar!');
            return;
        }

        if (this.isPreviewPlaying) {
            this.stopPreview();
            return;
        }

        this.isPreviewPlaying = true;
        this.btnPreview.textContent = '⏹ Stop Preview';
        this.currentSlide = 0;

        const texts = this.getTexts();
        const duration = parseInt(this.slideDuration.value) * 1000;

        const playSlide = async () => {
            if (!this.isPreviewPlaying) return;
            if (this.currentSlide >= this.images.length) {
                this.currentSlide = 0;
            }

            const img = await this.loadImage(this.images[this.currentSlide].src);
            const text = texts[this.currentSlide] || '';
            this.drawSlide(img, text);
            this.currentSlide++;
        };

        await playSlide();
        this.previewInterval = setInterval(playSlide, duration);
    }

    stopPreview() {
        this.isPreviewPlaying = false;
        this.btnPreview.textContent = '▶ Preview Slideshow';
        if (this.previewInterval) {
            clearInterval(this.previewInterval);
            this.previewInterval = null;
        }
    }

    async generateVideo() {
        if (this.images.length === 0) {
            alert('Silakan upload minimal 1 gambar!');
            return;
        }

        this.stopPreview();
        this.progressBar.style.display = 'block';
        this.downloadSection.style.display = 'none';
        this.btnGenerate.disabled = true;
        this.btnGenerate.textContent = '⏳ Memproses...';

        const res = parseInt(this.videoResolution.value);
        const width = res === 1080 ? 1920 : 1280;
        const height = res === 1080 ? 1080 : 720;
        this.canvas.width = width;
        this.canvas.height = height;

        const fps = 30;
        const duration = parseInt(this.slideDuration.value);
        const transitionType = this.transition.value;
        const transitionDuration = 0.5; // seconds
        const texts = this.getTexts();

        // Use MediaRecorder API
        const stream = this.canvas.captureStream(fps);

        // Add audio if available
        let audioCtx, audioSource, audioDestination;
        if (this.audioFile) {
            audioCtx = new AudioContext();
            const audioBuffer = await this.audioFile.arrayBuffer();
            const decodedAudio = await audioCtx.decodeAudioData(audioBuffer);
            audioSource = audioCtx.createBufferSource();
            audioSource.buffer = decodedAudio;
            audioDestination = audioCtx.createMediaStreamDestination();
            audioSource.connect(audioDestination);
            
            // Add audio track to stream
            const audioTrack = audioDestination.stream.getAudioTracks()[0];
            stream.addTrack(audioTrack);
            audioSource.start();
        }

        const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9',
            videoBitsPerSecond: 5000000
        });

        const chunks = [];
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            this.downloadLink.href = url;
            this.downloadLink.download = 'slideshow-video.webm';
            this.downloadSection.style.display = 'block';
            this.btnGenerate.disabled = false;
            this.btnGenerate.textContent = '🎬 Generate Video';

            if (audioSource) {
                audioSource.stop();
                audioCtx.close();
            }
        };

        mediaRecorder.start();

        // Render frames
        const totalSlides = this.images.length;
        const totalFrames = totalSlides * duration * fps;
        const transitionFrames = transitionDuration * fps;
        let frameCount = 0;

        for (let slideIdx = 0; slideIdx < totalSlides; slideIdx++) {
            const img = await this.loadImage(this.images[slideIdx].src);
            const text = texts[slideIdx] || '';
            const framesPerSlide = duration * fps;

            let nextImg = null;
            if (slideIdx < totalSlides - 1) {
                nextImg = await this.loadImage(this.images[slideIdx + 1].src);
            }

            for (let frame = 0; frame < framesPerSlide; frame++) {
                // Check if we're in transition phase
                const isTransitionPhase = frame >= (framesPerSlide - transitionFrames) && nextImg && transitionType !== 'none';
                
                if (isTransitionPhase) {
                    const progress = (frame - (framesPerSlide - transitionFrames)) / transitionFrames;
                    this.renderTransition(img, nextImg, text, texts[slideIdx + 1] || '', progress, transitionType, width, height);
                } else {
                    this.drawSlide(img, text);
                }

                frameCount++;
                const percent = Math.round((frameCount / totalFrames) * 100);
                this.progressFill.style.width = percent + '%';
                this.progressText.textContent = percent + '%';

                // Give browser time to process
                if (frame % 5 === 0) {
                    await new Promise(r => setTimeout(r, 0));
                }
            }
        }

        // Stop recording
        mediaRecorder.stop();
        this.progressFill.style.width = '100%';
        this.progressText.textContent = '100% - Selesai!';
    }

    renderTransition(currentImg, nextImg, currentText, nextText, progress, type, width, height) {
        this.ctx.clearRect(0, 0, width, height);
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, width, height);

        switch (type) {
            case 'fade':
                this.drawSlide(currentImg, currentText, 1 - progress);
                this.ctx.globalAlpha = progress;
                this.drawSlideOnTop(nextImg, nextText, width, height);
                this.ctx.globalAlpha = 1;
                break;

            case 'slide-left':
                this.ctx.save();
                this.ctx.translate(-width * progress, 0);
                this.drawSlide(currentImg, currentText);
                this.ctx.restore();
                this.ctx.save();
                this.ctx.translate(width * (1 - progress), 0);
                this.drawSlide(nextImg, nextText);
                this.ctx.restore();
                break;

            case 'slide-right':
                this.ctx.save();
                this.ctx.translate(width * progress, 0);
                this.drawSlide(currentImg, currentText);
                this.ctx.restore();
                this.ctx.save();
                this.ctx.translate(-width * (1 - progress), 0);
                this.drawSlide(nextImg, nextText);
                this.ctx.restore();
                break;

            case 'zoom':
                const scale = 1 + progress * 0.5;
                this.ctx.save();
                this.ctx.translate(width / 2, height / 2);
                this.ctx.scale(scale, scale);
                this.ctx.globalAlpha = 1 - progress;
                this.ctx.translate(-width / 2, -height / 2);
                this.drawSlide(currentImg, currentText);
                this.ctx.restore();
                this.ctx.globalAlpha = progress;
                this.drawSlide(nextImg, nextText);
                this.ctx.globalAlpha = 1;
                break;

            default:
                this.drawSlide(nextImg, nextText);
        }
    }

    drawSlideOnTop(imageObj, text, width, height) {
        if (imageObj) {
            const imgRatio = imageObj.width / imageObj.height;
            const canvasRatio = width / height;
            let drawW, drawH, drawX, drawY;

            if (imgRatio > canvasRatio) {
                drawH = height;
                drawW = height * imgRatio;
                drawX = (width - drawW) / 2;
                drawY = 0;
            } else {
                drawW = width;
                drawH = width / imgRatio;
                drawX = 0;
                drawY = (height - drawH) / 2;
            }
            this.ctx.drawImage(imageObj, drawX, drawY, drawW, drawH);
        }

        if (text) {
            const size = parseInt(this.fontSize.value);
            const font = this.fontSelect.value;
            const color = this.fontColor.value;
            const position = this.textPosition.value;

            this.ctx.font = `bold ${size}px ${font}`;
            this.ctx.fillStyle = color;
            this.ctx.textAlign = 'center';
            this.ctx.shadowColor = 'rgba(0,0,0,0.8)';
            this.ctx.shadowBlur = 8;

            let y;
            if (position === 'top') y = size + 40;
            else if (position === 'center') y = height / 2;
            else y = height - 60;

            this.ctx.fillText(text, width / 2, y);
            this.ctx.shadowColor = 'transparent';
            this.ctx.shadowBlur = 0;
        }
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    new SlideshowGenerator();
});
