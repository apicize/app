/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { DndContext, DragEndEvent, DragMoveEvent, MouseSensor, useSensor, useSensors } from "@dnd-kit/core";
import { DraggableData, DroppableData } from "../models/drag-drop";
import { createContext, ReactNode, useContext } from "react";
import { action, observable } from "mobx";
import { IndexedEntityPosition } from "../models/workspace/indexed-entity-position";

export type DragDropPosition = IndexedEntityPosition | 'INVALID' | null

/**
 * Global store for drag/drop state
 */
export class DragDropStore {
    @observable accessor dragPosition: DragDropPosition = null

    @action
    setDragPosition(newPosition: DragDropPosition) {
        this.dragPosition = newPosition
    }

    toBackgroundColor() {
        switch (this.dragPosition) {
            case IndexedEntityPosition.Before:
                return "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(128,128,128,1) 25%, rgba(64,64,64,1) 75%);"
            case IndexedEntityPosition.After:
                return "linear-gradient(0deg, rgba(255,255,255,1) 0%, rgba(128,128,128,1) 25%, rgba(64,64,64,1) 75%);"
            case IndexedEntityPosition.Under:
                return "linear-gradient(90deg, rgba(255,255,255,1) 0%, rgba(128,128,128,1) 13%, rgba(64,64,64,1) 44%);"
            case 'INVALID':
                return 'rgba(128, 0, 0, 0.5)'
            default:
                return 'default'
        }
    }
}

export const DragDropProvider = ({ children }: { children?: ReactNode }) => {
    const store = new DragDropStore()

    // const session = useNavigation()

    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 8
            }
        })
    )

    const onDragCancel = (/*e: DragCancelEvent*/) => {
        store.setDragPosition(null)
    }

    const positionFromEvent = (e: DragMoveEvent | DragEndEvent): DragDropPosition => {
        const { activatorEvent, delta, active, over } = e
        if (!over) return null

        const pointer = activatorEvent as unknown as any

        const activeData = active.data.current as unknown as DraggableData
        const overData = over.data.current as unknown as DroppableData

        const evtDelta = delta as any

        const x = pointer.x + evtDelta.x
        const y = pointer.y + evtDelta.y

        const r = e.over?.rect

        if (active.id === over.id) {
            return 'INVALID'
        } else if (overData.acceptsTypes.includes(activeData.type)) {
            if (overData.isHeader) {
                if (overData.acceptAppend) {
                    return IndexedEntityPosition.Under
                }
            } else if (overData.acceptAppend &&
                ((!overData.acceptReposition) || x < 72 + (overData.depth + 1) * 16)) {
                return IndexedEntityPosition.Under
            } else if (overData.acceptReposition) {
                if (r) {
                    return (y > r.top + (r.height / 2))
                        ? IndexedEntityPosition.After
                        : IndexedEntityPosition.Before
                }
            }
        }

        return null
    }

    const onDragMove = (e: DragMoveEvent) => {
        store.setDragPosition(positionFromEvent(e))
    }

    const onDragEnd = (e: DragEndEvent) => {


        const { active, over } = e
        const endingPosition = positionFromEvent(e)
        if (!over || !active || endingPosition === 'INVALID' || endingPosition === null) {
            return
        }

        const activeData = active.data.current as unknown as DraggableData
        const overData = over.data.current as unknown as DroppableData

        const id = overData.isHeader
            ? (overData.persistence ? overData.persistence : null)
            : over.id.toString()


        if (id) {
            activeData.move(id, endingPosition)
        }

        // let evtDelta = delta as any

        // let x = pointer.x + evtDelta.x
        // let y = pointer.y + evtDelta.y

        // let r = e.over?.rect

        // let onLowerHalf = false
        // let onSection = false

        // if (r) {
        //     if (y > r.top + (r.height / 2)) onLowerHalf = true
        //     if (x < 72 + overData.depth * 16) onSection = true
        // }

        // if (overData.isHeader && overData.persistence) {
        //     onSection = true
        //     // session.updateExpanded(over.id.toString(), true)
        // }

        // if (id && overData.acceptsTypes.includes(activeData.type)) {
        //     const position = overData.isHeader ? IndexedEntityPosition.Under :
        //         onLowerHalf ? IndexedEntityPosition.After : IndexedEntityPosition.Before
        //     activeData.move(id, position)
        // }

        store.setDragPosition(null)
    }

    return <DragDropContext.Provider value={store}>
        <DndContext key='dnd' sensors={sensors} onDragMove={onDragMove} onDragEnd={onDragEnd} onDragCancel={onDragCancel}>
            {children}
        </DndContext>
    </DragDropContext.Provider>
}

export const DragDropContext = createContext<DragDropStore | null>(null)

export function useDragDrop() {
    const context = useContext(DragDropContext);
    if (!context) {
        throw new Error('useDragDrop must be used within a DragDropContext.Provider');
    }
    return context;
}
