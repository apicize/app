import { createContext, RefObject, useContext } from "react";


interface DragDropCallbacks {
    onEnter?: (x: number, y: number, extensions: string[]) => void,
    onOver?: (x: number, y: number, extensions: string[]) => void,
    onLeave?: () => void,
    onDrop?: (file: DroppedFile) => void
}

interface DragDropTarget {
    rect: DOMRectReadOnly
    callbacks: DragDropCallbacks

}

export class FileDragDropStore {

    private observedTargets = new Map<string, DragDropTarget>()

    private lastResize = 0
    private updateIfSettled = (entries: ResizeObserverEntry[]) => {
        if (Date.now() - this.lastResize > 500) {
            for (const entry of entries) {
                const observer = this.observedTargets.get(entry.target.id)
                if (observer) {
                    observer.rect = entry.target.getBoundingClientRect()
                }
            }
        } else {
            setTimeout(() => this.updateIfSettled(entries), 500)
        }
    }

    private resizeObserver = new ResizeObserver(this.updateIfSettled)

    private currentX = 0
    private currentY = 0
    private currentExtensions: string[] = []

    private inRange(rect: DOMRect) {
        return this.currentX >= rect.left
            && this.currentY >= rect.top
            && this.currentX <= rect.right
            && this.currentY <= rect.bottom
    }

    private updateExtensions(paths: string[]) {
        const exts: string[] = []
        for (const path of paths) {
            const l = path.toLowerCase()
            const i = l.lastIndexOf('.')
            if (i !== -1) {
                const ext = l.substring(i + 1)
                if (!exts.includes(ext)) {
                    exts.push(ext)
                }
            }
        }
        this.currentExtensions = exts
    }

    register(refContainer: RefObject<HTMLElement>, callbacks: DragDropCallbacks) {
        const element = refContainer.current
        const id = element?.id
        if (!element || !id) {
            throw new Error('Drag/Drop container must have an ID')
        }
        const target: DragDropTarget = {
            rect: element.getClientRects()[0],
            callbacks
        }
        this.observedTargets.set(id, target)
        this.resizeObserver.observe(element, {
            box: undefined
        })
        // Use the element and ID captured at registration, since the ref is usually
        // cleared by the time an effect's cleanup runs
        return () => {
            this.resizeObserver.unobserve(element)
            if (this.observedTargets.get(id) === target) {
                this.observedTargets.delete(id)
            }
        }
    }

    unregister(refContainer: RefObject<HTMLElement>) {
        const element = refContainer.current
        if (element) {
            this.resizeObserver.unobserve(element)
            if (element.id) {
                this.observedTargets.delete(element.id)
            }
        }
    }

    onEnter(x: number, y: number, paths: string[]) {
        this.currentX = x
        this.currentY = y
        this.updateExtensions(paths)
        for (const target of this.observedTargets.values()) {
            if (this.inRange(target.rect)) {
                if (target.callbacks.onEnter) {
                    target.callbacks.onEnter(x, y, this.currentExtensions)
                }
            } else if (target.callbacks.onLeave) {
                target.callbacks.onLeave()
            }
        }
    }

    onOver(x: number, y: number) {
        this.currentX = x
        this.currentY = y
        for (const target of this.observedTargets.values()) {
            if (this.inRange(target.rect)) {
                if (target.callbacks.onOver) {
                    target.callbacks.onOver(x, y, this.currentExtensions)
                }
            } else if (target.callbacks.onLeave) {
                target.callbacks.onLeave()
            }
        }
    }

    onLeave() {
        for (const target of this.observedTargets.values()) {
            if (target.callbacks.onLeave) {
                target.callbacks.onLeave()
            }
        }
    }

    onDrop(file: DroppedFile) {
        for (const target of this.observedTargets.values()) {
            if (this.inRange(target.rect) && target.callbacks.onDrop) {
                target.callbacks.onDrop(file)
            }
        }
    }
}

export const FileDragDropContext = createContext<FileDragDropStore | null>(null)

export function useFileDragDrop() {
    const context = useContext(FileDragDropContext);
    if (!context) {
        throw new Error('useFileDragDrop must be used within a FileDragDropContext.Provider');
    }
    return context;
}

export type DroppedFile = DroppedTextFile | DroppedBinaryFile

export interface DroppedTextFile {
    type: 'text'
    data: string
    extension: string
}

export interface DroppedBinaryFile {
    type: 'binary'
    data: Uint8Array
    extension: string
}
