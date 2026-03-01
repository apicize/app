/**
 * Identifies active selection, by ID and name
 */
export interface Selection {
    id: string
    name: string
}

export const NO_SELECTION_ID = '\tNONE\t'
export const NO_SELECTION: Selection = {
  id: NO_SELECTION_ID,
  name: 'None (Off)'
}

export const DEFAULT_SELECTION_ID = '\tDEFAULT\t'
export const DEFAULT_SELECTION: Selection = {
  id: DEFAULT_SELECTION_ID,
  name: '(Default)'
}
