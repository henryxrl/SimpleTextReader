/**
 * @fileoverview Cover animation module for visualizing file processing progress on the book cover
 *
 * @module client/app/modules/components/cover-animation
 * @requires shared/utils/logger
 */

import { Logger } from "../../../../shared/utils/logger.js";

/**
 * Cover animation factory and types
 */
export const CoverAnimation = {
    // Animation types
    Type: {
        RADAR: "radar",
        VERTICAL: "vertical",
    },

    // Factory method
    create(canvas, type = this.Type.RADAR) {
        const animation =
            type === this.Type.VERTICAL ? new VerticalScanAnimation(canvas) : new RadarScanAnimation(canvas);

        animation.type = type;
        return animation;
    },
};

/**
 * Base class for book cover animations
 * @abstract
 * @class
 */
class BaseAnimation {
    /**
     * @private
     * @type {Logger}
     */
    logger = Logger.getLogger(this, false);

    /**
     * Constructor for BaseAnimation
     * @param {HTMLCanvasElement} canvas - The canvas element to animate
     */
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.width = canvas.width;
        this.height = canvas.height;
        this.originalImageData = null;
        this.animationFrameId = null;
        this.OVERLAY_COLOR = "rgba(0, 0, 0, 0.5)";
        this.SCAN_LINE_COLOR = "rgba(0, 0, 0, 0)";

        // Obtain canvas' parent element
        this.coverElement = canvas.parentElement;
    }

    /**
     * Sets the cover interactivity
     * @param {boolean} isProcessing - Whether the cover is processing
     */
    _setCoverInteractivity(isProcessing) {
        if (this.coverElement) {
            this.coverElement.style.pointerEvents = isProcessing ? "none" : "auto";
            this.coverElement.style.cursor = isProcessing ? "progress" : "pointer";
        }
    }

    /**
     * Starts or updates the animation
     * @param {number} percentage - Current progress (0-100)
     */
    start(percentage) {
        this._setCoverInteractivity(percentage < 100);
    }

    /**
     * Stops the animation
     */
    stop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
            this._restoreOriginalState();
        }
        this._setCoverInteractivity(false);
    }

    /**
     * Resets the canvas to its original state
     */
    reset() {
        if (this.originalImageData) {
            this.ctx.putImageData(this.originalImageData, 0, 0);
        }
    }

    /**
     * Saves the original canvas state
     * @protected
     */
    _saveOriginalState() {
        if (!this.originalImageData) {
            this.originalImageData = this.ctx.getImageData(0, 0, this.width, this.height);
        }
    }

    /**
     * Restores the original canvas state
     * @protected
     */
    _restoreOriginalState() {
        if (this.originalImageData) {
            this.ctx.putImageData(this.originalImageData, 0, 0);
        }
    }
}

/**
 * RadarScanAnimation class to display the radar scan animation on the book cover
 * @extends BaseAnimation
 * @class
 */
class RadarScanAnimation extends BaseAnimation {
    /**
     * Constructor for RadarScanAnimation
     * @param {HTMLCanvasElement} canvas - The canvas element to animate
     */
    constructor(canvas) {
        super(canvas);
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
        this.radius = Math.sqrt(this.width * this.width + this.height * this.height) / 2;
        this.currentAngle = -Math.PI / 2;
        this.targetAngle = -Math.PI / 2;
    }

    /**
     * Starts the radar scan animation
     * @param {number} percentage - Current progress (0-100)
     */
    start(percentage) {
        super.start(percentage);
        this.logger.log(`Animation start with percentage: ${percentage}`);
        this._saveOriginalState();
        this.targetAngle = -Math.PI / 2 + (percentage / 100) * Math.PI * 2.01;

        const animate = () => {
            // If original image data is not available, stop the animation
            if (!this.originalImageData) return;

            // Clear the canvas
            this.ctx.clearRect(0, 0, this.width, this.height);

            // Restore the original image
            this._restoreOriginalState();

            // Check if the circle is completed
            const hasCompletedCircle = this.currentAngle >= Math.PI * 1.5;
            this.logger.log(
                `Current state: angle=${this.currentAngle.toFixed(2)}, target=${this.targetAngle.toFixed(
                    2
                )}, completed=${hasCompletedCircle}`
            );

            // When the progress is 100%, let the animation complete the last frame
            if (!hasCompletedCircle) {
                this.ctx.save();
                this.ctx.beginPath();
                this.ctx.translate(this.centerX, this.centerY);
                this.ctx.moveTo(0, 0);
                this.ctx.arc(0, 0, this.radius, this.currentAngle, Math.PI * 1.5);
                this.ctx.lineTo(0, 0);
                this.ctx.fillStyle = this.OVERLAY_COLOR;
                this.ctx.fill();

                // Draw the scan line
                this.ctx.beginPath();
                this.ctx.strokeStyle = this.SCAN_LINE_COLOR;
                this.ctx.lineWidth = 2;
                this.ctx.moveTo(0, 0);
                this.ctx.lineTo(Math.cos(this.currentAngle) * this.radius, Math.sin(this.currentAngle) * this.radius);
                this.ctx.stroke();

                // Restore the saved state
                this.ctx.restore();
            }

            // Calculate the angle difference and update the current angle
            const angleDiff = this.targetAngle - this.currentAngle;
            if (Math.abs(angleDiff) > 0.01) {
                this.currentAngle += angleDiff * 0.1;
                this.animationFrameId = requestAnimationFrame(animate);
            } else {
                this.logger.log(`Animation check: percentage=${percentage}, completed=${hasCompletedCircle}`);
                if (percentage >= 100 && hasCompletedCircle) {
                    this.logger.log("Stopping animation");
                    this.stop();
                } else if (!hasCompletedCircle) {
                    // Only continue the animation when the circle is not completed
                    this.animationFrameId = requestAnimationFrame(animate);
                }
            }
        };

        if (!this.animationFrameId) {
            animate();
        }
    }
}

/**
 * VerticalScanAnimation class to display the vertical scan animation on the book cover
 * @extends BaseAnimation
 * @class
 */
class VerticalScanAnimation extends BaseAnimation {
    /**
     * Constructor for VerticalScanAnimation
     * @param {HTMLCanvasElement} canvas - The canvas element to animate
     */
    constructor(canvas) {
        super(canvas);
        this.currentY = this.height;
        this.targetY = this.height;
    }

    /**
     * Starts the vertical scan animation
     * @param {number} percentage - Current progress (0-100)
     */
    start(percentage) {
        super.start(percentage);
        this.logger.log(`Animation start with percentage: ${percentage}`);
        this._saveOriginalState();
        this.targetY = this.height - (percentage / 100) * this.height * 1.01;

        const animate = () => {
            // If original image data is not available, stop the animation
            if (!this.originalImageData) return;

            // Clear the canvas
            this.ctx.clearRect(0, 0, this.width, this.height);

            // Restore the original image
            this._restoreOriginalState();

            // Check if scan is completed
            const hasCompletedScan = Math.abs(this.currentY - this.targetY) < 0.1;
            this.logger.log(
                `Current state: y=${this.currentY.toFixed(2)}, target=${this.targetY.toFixed(
                    2
                )}, completed=${hasCompletedScan}`
            );

            // When the progress is 100%, let the animation complete the last frame
            if (!hasCompletedScan) {
                // Save the current state
                this.ctx.save();
                this.ctx.beginPath();

                // Draw the overlay area (from top to scan line)
                this.ctx.rect(0, 0, this.width, this.currentY);
                this.ctx.fillStyle = this.OVERLAY_COLOR;
                this.ctx.fill();

                // Draw the scan line
                this.ctx.beginPath();
                this.ctx.strokeStyle = this.SCAN_LINE_COLOR;
                this.ctx.lineWidth = 2;
                this.ctx.moveTo(0, this.currentY);
                this.ctx.lineTo(this.width, this.currentY);
                this.ctx.stroke();

                // Restore the saved state
                this.ctx.restore();
            }

            // Calculate the y difference and update the current y
            const yDiff = this.targetY - this.currentY;
            if (Math.abs(yDiff) > 0.1) {
                this.currentY += yDiff * 0.1;
                this.animationFrameId = requestAnimationFrame(animate);
            } else {
                this.logger.log(`Animation check: percentage=${percentage}, completed=${hasCompletedScan}`);
                if (percentage >= 100 && hasCompletedScan) {
                    this.logger.log("Stopping animation");
                    this.stop();
                } else if (!hasCompletedScan) {
                    // Only continue the animation when the scan is not completed
                    this.animationFrameId = requestAnimationFrame(animate);
                }
            }
        };

        if (!this.animationFrameId) {
            animate();
        }
    }
}
