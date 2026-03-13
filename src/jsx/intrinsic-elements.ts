/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-empty-interface */
/**
 * @file
 * HTML elements and CSS properties that Satori supports.
 *
 * This code is adapted from React v19.1 types.
 * MIT License
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * @see {@link https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/react/index.d.ts React typings `@types/react`}
 */
import type { JSXNode } from './types.js'

/**
 * Subset of CSS properties that Satori supports.
 *
 * @todo Add properties.
 */
export interface CSSProperties {
  [prop: string]: string | number | undefined
}

type Booleanish = 'true' | 'false' | boolean
type CrossOrigin = 'anonymous' | 'use-credentials' | '' | undefined

interface SVGProps<T> extends SVGAttributes<T> {}

interface SVGLineElementAttributes<T> extends SVGProps<T> {}
interface SVGTextElementAttributes<T> extends SVGProps<T> {}

interface DOMAttributes<T> {
  children?: JSXNode | undefined
}

type AriaRole =
  | 'alert'
  | 'alertdialog'
  | 'application'
  | 'article'
  | 'banner'
  | 'button'
  | 'cell'
  | 'checkbox'
  | 'columnheader'
  | 'combobox'
  | 'complementary'
  | 'contentinfo'
  | 'definition'
  | 'dialog'
  | 'directory'
  | 'document'
  | 'feed'
  | 'figure'
  | 'form'
  | 'grid'
  | 'gridcell'
  | 'group'
  | 'heading'
  | 'img'
  | 'link'
  | 'list'
  | 'listbox'
  | 'listitem'
  | 'log'
  | 'main'
  | 'marquee'
  | 'math'
  | 'menu'
  | 'menubar'
  | 'menuitem'
  | 'menuitemcheckbox'
  | 'menuitemradio'
  | 'navigation'
  | 'none'
  | 'note'
  | 'option'
  | 'presentation'
  | 'progressbar'
  | 'radio'
  | 'radiogroup'
  | 'region'
  | 'row'
  | 'rowgroup'
  | 'rowheader'
  | 'scrollbar'
  | 'search'
  | 'searchbox'
  | 'separator'
  | 'slider'
  | 'spinbutton'
  | 'status'
  | 'switch'
  | 'tab'
  | 'table'
  | 'tablist'
  | 'tabpanel'
  | 'term'
  | 'textbox'
  | 'timer'
  | 'toolbar'
  | 'tooltip'
  | 'tree'
  | 'treegrid'
  | 'treeitem'
  | (string & {})

interface AriaAttributes {
  /** Identifies the currently active element when DOM focus is on a composite widget, textbox, group, or application. */
  'aria-activedescendant'?: string | undefined
  /** Indicates whether assistive technologies will present all, or only parts of, the changed region based on the change notifications defined by the aria-relevant attribute. */
  'aria-atomic'?: Booleanish | undefined
  /**
   * Indicates whether inputting text could trigger display of one or more predictions of the user's intended value for an input and specifies how predictions would be
   * presented if they are made.
   */
  'aria-autocomplete'?: 'none' | 'inline' | 'list' | 'both' | undefined
  /** Indicates an element is being modified and that assistive technologies MAY want to wait until the modifications are complete before exposing them to the user. */
  /**
   * Defines a string value that labels the current element, which is intended to be converted into Braille.
   * @see aria-label.
   */
  'aria-braillelabel'?: string | undefined
  /**
   * Defines a human-readable, author-localized abbreviated description for the role of an element, which is intended to be converted into Braille.
   * @see aria-roledescription.
   */
  'aria-brailleroledescription'?: string | undefined
  'aria-busy'?: Booleanish | undefined
  /**
   * Indicates the current "checked" state of checkboxes, radio buttons, and other widgets.
   * @see aria-pressed @see aria-selected.
   */
  'aria-checked'?: boolean | 'false' | 'mixed' | 'true' | undefined
  /**
   * Defines the total number of columns in a table, grid, or treegrid.
   * @see aria-colindex.
   */
  'aria-colcount'?: number | undefined
  /**
   * Defines an element's column index or position with respect to the total number of columns within a table, grid, or treegrid.
   * @see aria-colcount @see aria-colspan.
   */
  'aria-colindex'?: number | undefined
  /**
   * Defines a human readable text alternative of aria-colindex.
   * @see aria-rowindextext.
   */
  'aria-colindextext'?: string | undefined
  /**
   * Defines the number of columns spanned by a cell or gridcell within a table, grid, or treegrid.
   * @see aria-colindex @see aria-rowspan.
   */
  'aria-colspan'?: number | undefined
  /**
   * Identifies the element (or elements) whose contents or presence are controlled by the current element.
   * @see aria-owns.
   */
  'aria-controls'?: string | undefined
  /** Indicates the element that represents the current item within a container or set of related elements. */
  'aria-current'?:
    | boolean
    | 'false'
    | 'true'
    | 'page'
    | 'step'
    | 'location'
    | 'date'
    | 'time'
    | undefined
  /**
   * Identifies the element (or elements) that describes the object.
   * @see aria-labelledby
   */
  'aria-describedby'?: string | undefined
  /**
   * Defines a string value that describes or annotates the current element.
   * @see related aria-describedby.
   */
  'aria-description'?: string | undefined
  /**
   * Identifies the element that provides a detailed, extended description for the object.
   * @see aria-describedby.
   */
  'aria-details'?: string | undefined
  /**
   * Indicates that the element is perceivable but disabled, so it is not editable or otherwise operable.
   * @see aria-hidden @see aria-readonly.
   */
  'aria-disabled'?: Booleanish | undefined
  /**
   * Indicates what functions can be performed when a dragged object is released on the drop target.
   * @deprecated in ARIA 1.1
   */
  'aria-dropeffect'?:
    | 'none'
    | 'copy'
    | 'execute'
    | 'link'
    | 'move'
    | 'popup'
    | undefined
  /**
   * Identifies the element that provides an error message for the object.
   * @see aria-invalid @see aria-describedby.
   */
  'aria-errormessage'?: string | undefined
  /** Indicates whether the element, or another grouping element it controls, is currently expanded or collapsed. */
  'aria-expanded'?: Booleanish | undefined
  /**
   * Identifies the next element (or elements) in an alternate reading order of content which, at the user's discretion,
   * allows assistive technology to override the general default of reading in document source order.
   */
  'aria-flowto'?: string | undefined
  /**
   * Indicates an element's "grabbed" state in a drag-and-drop operation.
   * @deprecated in ARIA 1.1
   */
  'aria-grabbed'?: Booleanish | undefined
  /** Indicates the availability and type of interactive popup element, such as menu or dialog, that can be triggered by an element. */
  'aria-haspopup'?:
    | boolean
    | 'false'
    | 'true'
    | 'menu'
    | 'listbox'
    | 'tree'
    | 'grid'
    | 'dialog'
    | undefined
  /**
   * Indicates whether the element is exposed to an accessibility API.
   * @see aria-disabled.
   */
  'aria-hidden'?: Booleanish | undefined
  /**
   * Indicates the entered value does not conform to the format expected by the application.
   * @see aria-errormessage.
   */
  'aria-invalid'?:
    | boolean
    | 'false'
    | 'true'
    | 'grammar'
    | 'spelling'
    | undefined
  /** Indicates keyboard shortcuts that an author has implemented to activate or give focus to an element. */
  'aria-keyshortcuts'?: string | undefined
  /**
   * Defines a string value that labels the current element.
   * @see aria-labelledby.
   */
  'aria-label'?: string | undefined
  /**
   * Identifies the element (or elements) that labels the current element.
   * @see aria-describedby.
   */
  'aria-labelledby'?: string | undefined
  /** Defines the hierarchical level of an element within a structure. */
  'aria-level'?: number | undefined
  /** Indicates that an element will be updated, and describes the types of updates the user agents, assistive technologies, and user can expect from the live region. */
  'aria-live'?: 'off' | 'assertive' | 'polite' | undefined
  /** Indicates whether an element is modal when displayed. */
  'aria-modal'?: Booleanish | undefined
  /** Indicates whether a text box accepts multiple lines of input or only a single line. */
  'aria-multiline'?: Booleanish | undefined
  /** Indicates that the user may select more than one item from the current selectable descendants. */
  'aria-multiselectable'?: Booleanish | undefined
  /** Indicates whether the element's orientation is horizontal, vertical, or unknown/ambiguous. */
  'aria-orientation'?: 'horizontal' | 'vertical' | undefined
  /**
   * Identifies an element (or elements) in order to define a visual, functional, or contextual parent/child relationship
   * between DOM elements where the DOM hierarchy cannot be used to represent the relationship.
   * @see aria-controls.
   */
  'aria-owns'?: string | undefined
  /**
   * Defines a short hint (a word or short phrase) intended to aid the user with data entry when the control has no value.
   * A hint could be a sample value or a brief description of the expected format.
   */
  'aria-placeholder'?: string | undefined
  /**
   * Defines an element's number or position in the current set of listitems or treeitems. Not required if all elements in the set are present in the DOM.
   * @see aria-setsize.
   */
  'aria-posinset'?: number | undefined
  /**
   * Indicates the current "pressed" state of toggle buttons.
   * @see aria-checked @see aria-selected.
   */
  'aria-pressed'?: boolean | 'false' | 'mixed' | 'true' | undefined
  /**
   * Indicates that the element is not editable, but is otherwise operable.
   * @see aria-disabled.
   */
  'aria-readonly'?: Booleanish | undefined
  /**
   * Indicates what notifications the user agent will trigger when the accessibility tree within a live region is modified.
   * @see aria-atomic.
   */
  'aria-relevant'?:
    | 'additions'
    | 'additions removals'
    | 'additions text'
    | 'all'
    | 'removals'
    | 'removals additions'
    | 'removals text'
    | 'text'
    | 'text additions'
    | 'text removals'
    | undefined
  /** Indicates that user input is required on the element before a form may be submitted. */
  'aria-required'?: Booleanish | undefined
  /** Defines a human-readable, author-localized description for the role of an element. */
  'aria-roledescription'?: string | undefined
  /**
   * Defines the total number of rows in a table, grid, or treegrid.
   * @see aria-rowindex.
   */
  'aria-rowcount'?: number | undefined
  /**
   * Defines an element's row index or position with respect to the total number of rows within a table, grid, or treegrid.
   * @see aria-rowcount @see aria-rowspan.
   */
  'aria-rowindex'?: number | undefined
  /**
   * Defines a human readable text alternative of aria-rowindex.
   * @see aria-colindextext.
   */
  'aria-rowindextext'?: string | undefined
  /**
   * Defines the number of rows spanned by a cell or gridcell within a table, grid, or treegrid.
   * @see aria-rowindex @see aria-colspan.
   */
  'aria-rowspan'?: number | undefined
  /**
   * Indicates the current "selected" state of various widgets.
   * @see aria-checked @see aria-pressed.
   */
  'aria-selected'?: Booleanish | undefined
  /**
   * Defines the number of items in the current set of listitems or treeitems. Not required if all elements in the set are present in the DOM.
   * @see aria-posinset.
   */
  'aria-setsize'?: number | undefined
  /** Indicates if items in a table or grid are sorted in ascending or descending order. */
  'aria-sort'?: 'none' | 'ascending' | 'descending' | 'other' | undefined
  /** Defines the maximum allowed value for a range widget. */
  'aria-valuemax'?: number | undefined
  /** Defines the minimum allowed value for a range widget. */
  'aria-valuemin'?: number | undefined
  /**
   * Defines the current value for a range widget.
   * @see aria-valuetext.
   */
  'aria-valuenow'?: number | undefined
  /** Defines the human readable text alternative of aria-valuenow for a range widget. */
  'aria-valuetext'?: string | undefined
}

interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
  // React-specific Attributes
  defaultChecked?: boolean | undefined
  defaultValue?: string | number | readonly string[] | undefined
  suppressContentEditableWarning?: boolean | undefined
  suppressHydrationWarning?: boolean | undefined

  // Standard HTML Attributes
  accessKey?: string | undefined
  autoCapitalize?:
    | 'off'
    | 'none'
    | 'on'
    | 'sentences'
    | 'words'
    | 'characters'
    | undefined
    | (string & {})
  autoFocus?: boolean | undefined
  className?: string | undefined
  contentEditable?: Booleanish | 'inherit' | 'plaintext-only' | undefined
  contextMenu?: string | undefined
  dir?: string | undefined
  draggable?: Booleanish | undefined
  enterKeyHint?:
    | 'enter'
    | 'done'
    | 'go'
    | 'next'
    | 'previous'
    | 'search'
    | 'send'
    | undefined
  hidden?: boolean | undefined
  id?: string | undefined
  lang?: string | undefined
  nonce?: string | undefined
  slot?: string | undefined
  spellCheck?: Booleanish | undefined
  style?: CSSProperties | undefined
  tabIndex?: number | undefined
  title?: string | undefined
  translate?: 'yes' | 'no' | undefined

  // Unknown
  radioGroup?: string | undefined // <command>, <menuitem>

  // WAI-ARIA
  role?: AriaRole | undefined

  // RDFa Attributes
  about?: string | undefined
  content?: string | undefined
  datatype?: string | undefined
  inlist?: any
  prefix?: string | undefined
  property?: string | undefined
  rel?: string | undefined
  resource?: string | undefined
  rev?: string | undefined
  typeof?: string | undefined
  vocab?: string | undefined

  // Non-standard Attributes
  autoCorrect?: string | undefined
  autoSave?: string | undefined
  color?: string | undefined
  itemProp?: string | undefined
  itemScope?: boolean | undefined
  itemType?: string | undefined
  itemID?: string | undefined
  itemRef?: string | undefined
  results?: number | undefined
  security?: string | undefined
  unselectable?: 'on' | 'off' | undefined

  // Popover API
  popover?: '' | 'auto' | 'manual' | undefined
  popoverTargetAction?: 'toggle' | 'show' | 'hide' | undefined
  popoverTarget?: string | undefined

  // Living Standard
  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/inert
   */
  inert?: boolean | undefined
  /**
   * Hints at the type of data that might be entered by the user while editing the element or its contents
   * @see {@link https://html.spec.whatwg.org/multipage/interaction.html#input-modalities:-the-inputmode-attribute}
   */
  inputMode?:
    | 'none'
    | 'text'
    | 'tel'
    | 'url'
    | 'email'
    | 'numeric'
    | 'decimal'
    | 'search'
    | undefined
  /**
   * Specify that a standard HTML element should behave like a defined custom built-in element
   * @see {@link https://html.spec.whatwg.org/multipage/custom-elements.html#attr-is}
   */
  is?: string | undefined
  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/exportparts}
   */
  exportparts?: string | undefined
  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/part}
   */
  part?: string | undefined
}

type DetailedHTMLProps<E extends HTMLAttributes<T>, T> = E

export type HTMLElementType =
  | 'a'
  | 'abbr'
  | 'address'
  | 'area'
  | 'article'
  | 'aside'
  | 'audio'
  | 'b'
  | 'base'
  | 'bdi'
  | 'bdo'
  | 'big'
  | 'blockquote'
  | 'body'
  | 'br'
  | 'button'
  | 'canvas'
  | 'caption'
  | 'center'
  | 'cite'
  | 'code'
  | 'col'
  | 'colgroup'
  | 'data'
  | 'datalist'
  | 'dd'
  | 'del'
  | 'details'
  | 'dfn'
  | 'dialog'
  | 'div'
  | 'dl'
  | 'dt'
  | 'em'
  | 'embed'
  | 'fieldset'
  | 'figcaption'
  | 'figure'
  | 'footer'
  | 'form'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'head'
  | 'header'
  | 'hgroup'
  | 'hr'
  | 'html'
  | 'i'
  | 'iframe'
  | 'img'
  | 'input'
  | 'ins'
  | 'kbd'
  | 'keygen'
  | 'label'
  | 'legend'
  | 'li'
  | 'link'
  | 'main'
  | 'map'
  | 'mark'
  | 'menu'
  | 'menuitem'
  | 'meta'
  | 'meter'
  | 'nav'
  | 'noscript'
  | 'object'
  | 'ol'
  | 'optgroup'
  | 'option'
  | 'output'
  | 'p'
  | 'param'
  | 'picture'
  | 'pre'
  | 'progress'
  | 'q'
  | 'rp'
  | 'rt'
  | 'ruby'
  | 's'
  | 'samp'
  | 'search'
  | 'slot'
  | 'script'
  | 'section'
  | 'select'
  | 'small'
  | 'source'
  | 'span'
  | 'strong'
  | 'style'
  | 'sub'
  | 'summary'
  | 'sup'
  | 'table'
  | 'template'
  | 'tbody'
  | 'td'
  | 'textarea'
  | 'tfoot'
  | 'th'
  | 'thead'
  | 'time'
  | 'title'
  | 'tr'
  | 'track'
  | 'u'
  | 'ul'
  | 'var'
  | 'video'
  | 'wbr'
  | 'webview'

export type SVGElementType =
  | 'animate'
  | 'circle'
  | 'clipPath'
  | 'defs'
  | 'desc'
  | 'ellipse'
  | 'feBlend'
  | 'feColorMatrix'
  | 'feComponentTransfer'
  | 'feComposite'
  | 'feConvolveMatrix'
  | 'feDiffuseLighting'
  | 'feDisplacementMap'
  | 'feDistantLight'
  | 'feDropShadow'
  | 'feFlood'
  | 'feFuncA'
  | 'feFuncB'
  | 'feFuncG'
  | 'feFuncR'
  | 'feGaussianBlur'
  | 'feImage'
  | 'feMerge'
  | 'feMergeNode'
  | 'feMorphology'
  | 'feOffset'
  | 'fePointLight'
  | 'feSpecularLighting'
  | 'feSpotLight'
  | 'feTile'
  | 'feTurbulence'
  | 'filter'
  | 'foreignObject'
  | 'g'
  | 'image'
  | 'line'
  | 'linearGradient'
  | 'marker'
  | 'mask'
  | 'metadata'
  | 'path'
  | 'pattern'
  | 'polygon'
  | 'polyline'
  | 'radialGradient'
  | 'rect'
  | 'stop'
  | 'svg'
  | 'switch'
  | 'symbol'
  | 'text'
  | 'textPath'
  | 'tspan'
  | 'use'
  | 'view'

type HTMLAttributeReferrerPolicy =
  | ''
  | 'no-referrer'
  | 'no-referrer-when-downgrade'
  | 'origin'
  | 'origin-when-cross-origin'
  | 'same-origin'
  | 'strict-origin'
  | 'strict-origin-when-cross-origin'
  | 'unsafe-url'

type HTMLAttributeAnchorTarget =
  | '_self'
  | '_blank'
  | '_parent'
  | '_top'
  | (string & {})

interface AnchorHTMLAttributes<T> extends HTMLAttributes<T> {
  download?: any
  href?: string | undefined
  hrefLang?: string | undefined
  media?: string | undefined
  ping?: string | undefined
  target?: HTMLAttributeAnchorTarget | undefined
  type?: string | undefined
  referrerPolicy?: HTMLAttributeReferrerPolicy | undefined
}

interface AudioHTMLAttributes<T> extends MediaHTMLAttributes<T> {}

interface AreaHTMLAttributes<T> extends HTMLAttributes<T> {
  alt?: string | undefined
  coords?: string | undefined
  download?: any
  href?: string | undefined
  hrefLang?: string | undefined
  media?: string | undefined
  referrerPolicy?: HTMLAttributeReferrerPolicy | undefined
  shape?: string | undefined
  target?: string | undefined
}

interface BaseHTMLAttributes<T> extends HTMLAttributes<T> {
  href?: string | undefined
  target?: string | undefined
}

interface BlockquoteHTMLAttributes<T> extends HTMLAttributes<T> {
  cite?: string | undefined
}

interface ButtonHTMLAttributes<T> extends HTMLAttributes<T> {
  disabled?: boolean | undefined
  form?: string | undefined
  formAction?:
    | string
    | ((formData: FormData) => void | Promise<void>)
    | undefined
  formEncType?: string | undefined
  formMethod?: string | undefined
  formNoValidate?: boolean | undefined
  formTarget?: string | undefined
  name?: string | undefined
  type?: 'submit' | 'reset' | 'button' | undefined
  value?: string | readonly string[] | number | undefined
}

interface CanvasHTMLAttributes<T> extends HTMLAttributes<T> {
  height?: number | string | undefined
  width?: number | string | undefined
}

interface ColHTMLAttributes<T> extends HTMLAttributes<T> {
  span?: number | undefined
  width?: number | string | undefined
}

interface ColgroupHTMLAttributes<T> extends HTMLAttributes<T> {
  span?: number | undefined
}

interface DataHTMLAttributes<T> extends HTMLAttributes<T> {
  value?: string | readonly string[] | number | undefined
}

interface DetailsHTMLAttributes<T> extends HTMLAttributes<T> {
  open?: boolean | undefined
  name?: string | undefined
}

interface DelHTMLAttributes<T> extends HTMLAttributes<T> {
  cite?: string | undefined
  dateTime?: string | undefined
}

interface DialogHTMLAttributes<T> extends HTMLAttributes<T> {
  open?: boolean | undefined
}

interface EmbedHTMLAttributes<T> extends HTMLAttributes<T> {
  height?: number | string | undefined
  src?: string | undefined
  type?: string | undefined
  width?: number | string | undefined
}

interface FieldsetHTMLAttributes<T> extends HTMLAttributes<T> {
  disabled?: boolean | undefined
  form?: string | undefined
  name?: string | undefined
}

interface FormHTMLAttributes<T> extends HTMLAttributes<T> {
  acceptCharset?: string | undefined
  action?: string | undefined | ((formData: FormData) => void | Promise<void>)
  autoComplete?: string | undefined
  encType?: string | undefined
  method?: string | undefined
  name?: string | undefined
  noValidate?: boolean | undefined
  target?: string | undefined
}

interface HtmlHTMLAttributes<T> extends HTMLAttributes<T> {
  manifest?: string | undefined
}

interface IframeHTMLAttributes<T> extends HTMLAttributes<T> {
  allow?: string | undefined
  allowFullScreen?: boolean | undefined
  allowTransparency?: boolean | undefined
  /** @deprecated */
  frameBorder?: number | string | undefined
  height?: number | string | undefined
  loading?: 'eager' | 'lazy' | undefined
  /** @deprecated */
  marginHeight?: number | undefined
  /** @deprecated */
  marginWidth?: number | undefined
  name?: string | undefined
  referrerPolicy?: HTMLAttributeReferrerPolicy | undefined
  sandbox?: string | undefined
  /** @deprecated */
  scrolling?: string | undefined
  seamless?: boolean | undefined
  src?: string | undefined
  srcDoc?: string | undefined
  width?: number | string | undefined
}

interface ImgHTMLAttributes<T> extends HTMLAttributes<T> {
  alt?: string | undefined
  crossOrigin?: CrossOrigin
  decoding?: 'async' | 'auto' | 'sync' | undefined
  fetchPriority?: 'high' | 'low' | 'auto'
  height?: number | string | undefined
  loading?: 'eager' | 'lazy' | undefined
  referrerPolicy?: HTMLAttributeReferrerPolicy | undefined
  sizes?: string | undefined
  src?: string | undefined
  srcSet?: string | undefined
  useMap?: string | undefined
  width?: number | string | undefined
}

interface InsHTMLAttributes<T> extends HTMLAttributes<T> {
  cite?: string | undefined
  dateTime?: string | undefined
}

type HTMLInputTypeAttribute =
  | 'button'
  | 'checkbox'
  | 'color'
  | 'date'
  | 'datetime-local'
  | 'email'
  | 'file'
  | 'hidden'
  | 'image'
  | 'month'
  | 'number'
  | 'password'
  | 'radio'
  | 'range'
  | 'reset'
  | 'search'
  | 'submit'
  | 'tel'
  | 'text'
  | 'time'
  | 'url'
  | 'week'
  | (string & {})

type AutoFillAddressKind = 'billing' | 'shipping'
type AutoFillBase = '' | 'off' | 'on'
type AutoFillContactField =
  | 'email'
  | 'tel'
  | 'tel-area-code'
  | 'tel-country-code'
  | 'tel-extension'
  | 'tel-local'
  | 'tel-local-prefix'
  | 'tel-local-suffix'
  | 'tel-national'
type AutoFillContactKind = 'home' | 'mobile' | 'work'
type AutoFillCredentialField = 'webauthn'
type AutoFillNormalField =
  | 'additional-name'
  | 'address-level1'
  | 'address-level2'
  | 'address-level3'
  | 'address-level4'
  | 'address-line1'
  | 'address-line2'
  | 'address-line3'
  | 'bday-day'
  | 'bday-month'
  | 'bday-year'
  | 'cc-csc'
  | 'cc-exp'
  | 'cc-exp-month'
  | 'cc-exp-year'
  | 'cc-family-name'
  | 'cc-given-name'
  | 'cc-name'
  | 'cc-number'
  | 'cc-type'
  | 'country'
  | 'country-name'
  | 'current-password'
  | 'family-name'
  | 'given-name'
  | 'honorific-prefix'
  | 'honorific-suffix'
  | 'name'
  | 'new-password'
  | 'one-time-code'
  | 'organization'
  | 'postal-code'
  | 'street-address'
  | 'transaction-amount'
  | 'transaction-currency'
  | 'username'
type OptionalPrefixToken<T extends string> = `${T} ` | ''
type OptionalPostfixToken<T extends string> = ` ${T}` | ''
type AutoFillField =
  | AutoFillNormalField
  | `${OptionalPrefixToken<AutoFillContactKind>}${AutoFillContactField}`
type AutoFillSection = `section-${string}`
type AutoFill =
  | AutoFillBase
  | `${OptionalPrefixToken<AutoFillSection>}${OptionalPrefixToken<AutoFillAddressKind>}${AutoFillField}${OptionalPostfixToken<AutoFillCredentialField>}`
type HTMLInputAutoCompleteAttribute = AutoFill | (string & {})

interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
  accept?: string | undefined
  alt?: string | undefined
  autoComplete?: HTMLInputAutoCompleteAttribute | undefined
  capture?: boolean | 'user' | 'environment' | undefined // https://www.w3.org/TR/html-media-capture/#the-capture-attribute
  checked?: boolean | undefined
  disabled?: boolean | undefined
  form?: string | undefined
  formAction?:
    | string
    | ((formData: FormData) => void | Promise<void>)
    | undefined
  formEncType?: string | undefined
  formMethod?: string | undefined
  formNoValidate?: boolean | undefined
  formTarget?: string | undefined
  height?: number | string | undefined
  list?: string | undefined
  max?: number | string | undefined
  maxLength?: number | undefined
  min?: number | string | undefined
  minLength?: number | undefined
  multiple?: boolean | undefined
  name?: string | undefined
  pattern?: string | undefined
  placeholder?: string | undefined
  readOnly?: boolean | undefined
  required?: boolean | undefined
  size?: number | undefined
  src?: string | undefined
  step?: number | string | undefined
  type?: HTMLInputTypeAttribute | undefined
  value?: string | readonly string[] | number | undefined
  width?: number | string | undefined
}

interface KeygenHTMLAttributes<T> extends HTMLAttributes<T> {
  challenge?: string | undefined
  disabled?: boolean | undefined
  form?: string | undefined
  keyType?: string | undefined
  keyParams?: string | undefined
  name?: string | undefined
}

interface LabelHTMLAttributes<T> extends HTMLAttributes<T> {
  form?: string | undefined
  htmlFor?: string | undefined
}

interface LiHTMLAttributes<T> extends HTMLAttributes<T> {
  value?: string | readonly string[] | number | undefined
}

interface LinkHTMLAttributes<T> extends HTMLAttributes<T> {
  as?: string | undefined
  blocking?: 'render' | (string & {}) | undefined
  crossOrigin?: CrossOrigin
  fetchPriority?: 'high' | 'low' | 'auto'
  href?: string | undefined
  hrefLang?: string | undefined
  integrity?: string | undefined
  media?: string | undefined
  imageSrcSet?: string | undefined
  imageSizes?: string | undefined
  referrerPolicy?: HTMLAttributeReferrerPolicy | undefined
  sizes?: string | undefined
  type?: string | undefined
  charSet?: string | undefined

  // React props
  precedence?: string | undefined
}

interface MapHTMLAttributes<T> extends HTMLAttributes<T> {
  name?: string | undefined
}

interface MenuHTMLAttributes<T> extends HTMLAttributes<T> {
  type?: string | undefined
}

interface MediaHTMLAttributes<T> extends HTMLAttributes<T> {
  autoPlay?: boolean | undefined
  controls?: boolean | undefined
  controlsList?: string | undefined
  crossOrigin?: CrossOrigin
  loop?: boolean | undefined
  mediaGroup?: string | undefined
  muted?: boolean | undefined
  playsInline?: boolean | undefined
  preload?: string | undefined
  src?: string | undefined
}

interface MetaHTMLAttributes<T> extends HTMLAttributes<T> {
  charSet?: string | undefined
  content?: string | undefined
  httpEquiv?: string | undefined
  media?: string | undefined
  name?: string | undefined
}

interface MeterHTMLAttributes<T> extends HTMLAttributes<T> {
  form?: string | undefined
  high?: number | undefined
  low?: number | undefined
  max?: number | string | undefined
  min?: number | string | undefined
  optimum?: number | undefined
  value?: string | readonly string[] | number | undefined
}

interface QuoteHTMLAttributes<T> extends HTMLAttributes<T> {
  cite?: string | undefined
}

interface ObjectHTMLAttributes<T> extends HTMLAttributes<T> {
  classID?: string | undefined
  data?: string | undefined
  form?: string | undefined
  height?: number | string | undefined
  name?: string | undefined
  type?: string | undefined
  useMap?: string | undefined
  width?: number | string | undefined
  wmode?: string | undefined
}

interface OlHTMLAttributes<T> extends HTMLAttributes<T> {
  reversed?: boolean | undefined
  start?: number | undefined
  type?: '1' | 'a' | 'A' | 'i' | 'I' | undefined
}

interface OptgroupHTMLAttributes<T> extends HTMLAttributes<T> {
  disabled?: boolean | undefined
  label?: string | undefined
}

interface OptionHTMLAttributes<T> extends HTMLAttributes<T> {
  disabled?: boolean | undefined
  label?: string | undefined
  selected?: boolean | undefined
  value?: string | readonly string[] | number | undefined
}

interface OutputHTMLAttributes<T> extends HTMLAttributes<T> {
  form?: string | undefined
  htmlFor?: string | undefined
  name?: string | undefined
}

interface ParamHTMLAttributes<T> extends HTMLAttributes<T> {
  name?: string | undefined
  value?: string | readonly string[] | number | undefined
}

interface ProgressHTMLAttributes<T> extends HTMLAttributes<T> {
  max?: number | string | undefined
  value?: string | readonly string[] | number | undefined
}

interface SlotHTMLAttributes<T> extends HTMLAttributes<T> {
  name?: string | undefined
}

interface ScriptHTMLAttributes<T> extends HTMLAttributes<T> {
  async?: boolean | undefined
  blocking?: 'render' | (string & {}) | undefined
  /** @deprecated */
  charSet?: string | undefined
  crossOrigin?: CrossOrigin
  defer?: boolean | undefined
  integrity?: string | undefined
  noModule?: boolean | undefined
  referrerPolicy?: HTMLAttributeReferrerPolicy | undefined
  src?: string | undefined
  type?: string | undefined
}

interface SelectHTMLAttributes<T> extends HTMLAttributes<T> {
  autoComplete?: string | undefined
  disabled?: boolean | undefined
  form?: string | undefined
  multiple?: boolean | undefined
  name?: string | undefined
  required?: boolean | undefined
  size?: number | undefined
  value?: string | readonly string[] | number | undefined
}

interface SourceHTMLAttributes<T> extends HTMLAttributes<T> {
  height?: number | string | undefined
  media?: string | undefined
  sizes?: string | undefined
  src?: string | undefined
  srcSet?: string | undefined
  type?: string | undefined
  width?: number | string | undefined
}

interface StyleHTMLAttributes<T> extends HTMLAttributes<T> {
  blocking?: 'render' | (string & {}) | undefined
  media?: string | undefined
  scoped?: boolean | undefined
  type?: string | undefined

  // React props
  href?: string | undefined
  precedence?: string | undefined
}

interface TableHTMLAttributes<T> extends HTMLAttributes<T> {
  align?: 'left' | 'center' | 'right' | undefined
  bgcolor?: string | undefined
  border?: number | undefined
  cellPadding?: number | string | undefined
  cellSpacing?: number | string | undefined
  frame?: boolean | undefined
  rules?: 'none' | 'groups' | 'rows' | 'columns' | 'all' | undefined
  summary?: string | undefined
  width?: number | string | undefined
}

interface TextareaHTMLAttributes<T> extends HTMLAttributes<T> {
  autoComplete?: string | undefined
  cols?: number | undefined
  dirName?: string | undefined
  disabled?: boolean | undefined
  form?: string | undefined
  maxLength?: number | undefined
  minLength?: number | undefined
  name?: string | undefined
  placeholder?: string | undefined
  readOnly?: boolean | undefined
  required?: boolean | undefined
  rows?: number | undefined
  value?: string | readonly string[] | number | undefined
  wrap?: string | undefined
}

interface TdHTMLAttributes<T> extends HTMLAttributes<T> {
  align?: 'left' | 'center' | 'right' | 'justify' | 'char' | undefined
  colSpan?: number | undefined
  headers?: string | undefined
  rowSpan?: number | undefined
  scope?: string | undefined
  abbr?: string | undefined
  height?: number | string | undefined
  width?: number | string | undefined
  valign?: 'top' | 'middle' | 'bottom' | 'baseline' | undefined
}

interface ThHTMLAttributes<T> extends HTMLAttributes<T> {
  align?: 'left' | 'center' | 'right' | 'justify' | 'char' | undefined
  colSpan?: number | undefined
  headers?: string | undefined
  rowSpan?: number | undefined
  scope?: string | undefined
  abbr?: string | undefined
}

interface TimeHTMLAttributes<T> extends HTMLAttributes<T> {
  dateTime?: string | undefined
}

interface TrackHTMLAttributes<T> extends HTMLAttributes<T> {
  default?: boolean | undefined
  kind?: string | undefined
  label?: string | undefined
  src?: string | undefined
  srcLang?: string | undefined
}

interface VideoHTMLAttributes<T> extends MediaHTMLAttributes<T> {
  height?: number | string | undefined
  playsInline?: boolean | undefined
  poster?: string | undefined
  width?: number | string | undefined
  disablePictureInPicture?: boolean | undefined
  disableRemotePlayback?: boolean | undefined
}

// this list is "complete" in that it contains every SVG attribute
// that React supports, but the types can be improved.
// Full list here: https://facebook.github.io/react/docs/dom-elements.html
//
// The three broad type categories are (in order of restrictiveness):
//   - "number | string"
//   - "string"
//   - union of string literals
interface SVGAttributes<T> extends AriaAttributes, DOMAttributes<T> {
  // React-specific Attributes
  suppressHydrationWarning?: boolean | undefined

  // Attributes which also defined in HTMLAttributes
  // See comment in SVGDOMPropertyConfig.js
  className?: string | undefined
  color?: string | undefined
  height?: number | string | undefined
  id?: string | undefined
  lang?: string | undefined
  max?: number | string | undefined
  media?: string | undefined
  method?: string | undefined
  min?: number | string | undefined
  name?: string | undefined
  style?: CSSProperties | undefined
  target?: string | undefined
  type?: string | undefined
  width?: number | string | undefined

  // Other HTML properties supported by SVG elements in browsers
  role?: AriaRole | undefined
  tabIndex?: number | undefined
  crossOrigin?: CrossOrigin

  // SVG Specific attributes
  accentHeight?: number | string | undefined
  accumulate?: 'none' | 'sum' | undefined
  additive?: 'replace' | 'sum' | undefined
  alignmentBaseline?:
    | 'auto'
    | 'baseline'
    | 'before-edge'
    | 'text-before-edge'
    | 'middle'
    | 'central'
    | 'after-edge'
    | 'text-after-edge'
    | 'ideographic'
    | 'alphabetic'
    | 'hanging'
    | 'mathematical'
    | 'inherit'
    | undefined
  allowReorder?: 'no' | 'yes' | undefined
  alphabetic?: number | string | undefined
  amplitude?: number | string | undefined
  arabicForm?: 'initial' | 'medial' | 'terminal' | 'isolated' | undefined
  ascent?: number | string | undefined
  attributeName?: string | undefined
  attributeType?: string | undefined
  autoReverse?: Booleanish | undefined
  azimuth?: number | string | undefined
  baseFrequency?: number | string | undefined
  baselineShift?: number | string | undefined
  baseProfile?: number | string | undefined
  bbox?: number | string | undefined
  begin?: number | string | undefined
  bias?: number | string | undefined
  by?: number | string | undefined
  calcMode?: number | string | undefined
  capHeight?: number | string | undefined
  clip?: number | string | undefined
  clipPath?: string | undefined
  clipPathUnits?: number | string | undefined
  clipRule?: number | string | undefined
  colorInterpolation?: number | string | undefined
  colorInterpolationFilters?:
    | 'auto'
    | 'sRGB'
    | 'linearRGB'
    | 'inherit'
    | undefined
  colorProfile?: number | string | undefined
  colorRendering?: number | string | undefined
  contentScriptType?: number | string | undefined
  contentStyleType?: number | string | undefined
  cursor?: number | string | undefined
  cx?: number | string | undefined
  cy?: number | string | undefined
  d?: string | undefined
  decelerate?: number | string | undefined
  descent?: number | string | undefined
  diffuseConstant?: number | string | undefined
  direction?: number | string | undefined
  display?: number | string | undefined
  divisor?: number | string | undefined
  dominantBaseline?: number | string | undefined
  dur?: number | string | undefined
  dx?: number | string | undefined
  dy?: number | string | undefined
  edgeMode?: number | string | undefined
  elevation?: number | string | undefined
  enableBackground?: number | string | undefined
  end?: number | string | undefined
  exponent?: number | string | undefined
  externalResourcesRequired?: Booleanish | undefined
  fill?: string | undefined
  fillOpacity?: number | string | undefined
  fillRule?: 'nonzero' | 'evenodd' | 'inherit' | undefined
  filter?: string | undefined
  filterRes?: number | string | undefined
  filterUnits?: number | string | undefined
  floodColor?: number | string | undefined
  floodOpacity?: number | string | undefined
  focusable?: Booleanish | 'auto' | undefined
  fontFamily?: string | undefined
  fontSize?: number | string | undefined
  fontSizeAdjust?: number | string | undefined
  fontStretch?: number | string | undefined
  fontStyle?: number | string | undefined
  fontVariant?: number | string | undefined
  fontWeight?: number | string | undefined
  format?: number | string | undefined
  fr?: number | string | undefined
  from?: number | string | undefined
  fx?: number | string | undefined
  fy?: number | string | undefined
  g1?: number | string | undefined
  g2?: number | string | undefined
  glyphName?: number | string | undefined
  glyphOrientationHorizontal?: number | string | undefined
  glyphOrientationVertical?: number | string | undefined
  glyphRef?: number | string | undefined
  gradientTransform?: string | undefined
  gradientUnits?: string | undefined
  hanging?: number | string | undefined
  horizAdvX?: number | string | undefined
  horizOriginX?: number | string | undefined
  href?: string | undefined
  ideographic?: number | string | undefined
  imageRendering?: number | string | undefined
  in2?: number | string | undefined
  in?: string | undefined
  intercept?: number | string | undefined
  k1?: number | string | undefined
  k2?: number | string | undefined
  k3?: number | string | undefined
  k4?: number | string | undefined
  k?: number | string | undefined
  kernelMatrix?: number | string | undefined
  kernelUnitLength?: number | string | undefined
  kerning?: number | string | undefined
  keyPoints?: number | string | undefined
  keySplines?: number | string | undefined
  keyTimes?: number | string | undefined
  lengthAdjust?: number | string | undefined
  letterSpacing?: number | string | undefined
  lightingColor?: number | string | undefined
  limitingConeAngle?: number | string | undefined
  local?: number | string | undefined
  markerEnd?: string | undefined
  markerHeight?: number | string | undefined
  markerMid?: string | undefined
  markerStart?: string | undefined
  markerUnits?: number | string | undefined
  markerWidth?: number | string | undefined
  mask?: string | undefined
  maskContentUnits?: number | string | undefined
  maskUnits?: number | string | undefined
  mathematical?: number | string | undefined
  mode?: number | string | undefined
  numOctaves?: number | string | undefined
  offset?: number | string | undefined
  opacity?: number | string | undefined
  operator?: number | string | undefined
  order?: number | string | undefined
  orient?: number | string | undefined
  orientation?: number | string | undefined
  origin?: number | string | undefined
  overflow?: number | string | undefined
  overlinePosition?: number | string | undefined
  overlineThickness?: number | string | undefined
  paintOrder?: number | string | undefined
  panose1?: number | string | undefined
  path?: string | undefined
  pathLength?: number | string | undefined
  patternContentUnits?: string | undefined
  patternTransform?: number | string | undefined
  patternUnits?: string | undefined
  pointerEvents?: number | string | undefined
  points?: string | undefined
  pointsAtX?: number | string | undefined
  pointsAtY?: number | string | undefined
  pointsAtZ?: number | string | undefined
  preserveAlpha?: Booleanish | undefined
  preserveAspectRatio?: string | undefined
  primitiveUnits?: number | string | undefined
  r?: number | string | undefined
  radius?: number | string | undefined
  refX?: number | string | undefined
  refY?: number | string | undefined
  renderingIntent?: number | string | undefined
  repeatCount?: number | string | undefined
  repeatDur?: number | string | undefined
  requiredExtensions?: number | string | undefined
  requiredFeatures?: number | string | undefined
  restart?: number | string | undefined
  result?: string | undefined
  rotate?: number | string | undefined
  rx?: number | string | undefined
  ry?: number | string | undefined
  scale?: number | string | undefined
  seed?: number | string | undefined
  shapeRendering?: number | string | undefined
  slope?: number | string | undefined
  spacing?: number | string | undefined
  specularConstant?: number | string | undefined
  specularExponent?: number | string | undefined
  speed?: number | string | undefined
  spreadMethod?: string | undefined
  startOffset?: number | string | undefined
  stdDeviation?: number | string | undefined
  stemh?: number | string | undefined
  stemv?: number | string | undefined
  stitchTiles?: number | string | undefined
  stopColor?: string | undefined
  stopOpacity?: number | string | undefined
  strikethroughPosition?: number | string | undefined
  strikethroughThickness?: number | string | undefined
  string?: number | string | undefined
  stroke?: string | undefined
  strokeDasharray?: string | number | undefined
  strokeDashoffset?: string | number | undefined
  strokeLinecap?: 'butt' | 'round' | 'square' | 'inherit' | undefined
  strokeLinejoin?: 'miter' | 'round' | 'bevel' | 'inherit' | undefined
  strokeMiterlimit?: number | string | undefined
  strokeOpacity?: number | string | undefined
  strokeWidth?: number | string | undefined
  surfaceScale?: number | string | undefined
  systemLanguage?: number | string | undefined
  tableValues?: number | string | undefined
  targetX?: number | string | undefined
  targetY?: number | string | undefined
  textAnchor?: string | undefined
  textDecoration?: number | string | undefined
  textLength?: number | string | undefined
  textRendering?: number | string | undefined
  to?: number | string | undefined
  transform?: string | undefined
  u1?: number | string | undefined
  u2?: number | string | undefined
  underlinePosition?: number | string | undefined
  underlineThickness?: number | string | undefined
  unicode?: number | string | undefined
  unicodeBidi?: number | string | undefined
  unicodeRange?: number | string | undefined
  unitsPerEm?: number | string | undefined
  vAlphabetic?: number | string | undefined
  values?: string | undefined
  vectorEffect?: number | string | undefined
  version?: string | undefined
  vertAdvY?: number | string | undefined
  vertOriginX?: number | string | undefined
  vertOriginY?: number | string | undefined
  vHanging?: number | string | undefined
  vIdeographic?: number | string | undefined
  viewBox?: string | undefined
  viewTarget?: number | string | undefined
  visibility?: number | string | undefined
  vMathematical?: number | string | undefined
  widths?: number | string | undefined
  wordSpacing?: number | string | undefined
  writingMode?: number | string | undefined
  x1?: number | string | undefined
  x2?: number | string | undefined
  x?: number | string | undefined
  xChannelSelector?: string | undefined
  xHeight?: number | string | undefined
  xlinkActuate?: string | undefined
  xlinkArcrole?: string | undefined
  xlinkHref?: string | undefined
  xlinkRole?: string | undefined
  xlinkShow?: string | undefined
  xlinkTitle?: string | undefined
  xlinkType?: string | undefined
  xmlBase?: string | undefined
  xmlLang?: string | undefined
  xmlns?: string | undefined
  xmlnsXlink?: string | undefined
  xmlSpace?: string | undefined
  y1?: number | string | undefined
  y2?: number | string | undefined
  y?: number | string | undefined
  yChannelSelector?: string | undefined
  z?: number | string | undefined
  zoomAndPan?: string | undefined
}

interface WebViewHTMLAttributes<T> extends HTMLAttributes<T> {
  allowFullScreen?: boolean | undefined
  allowpopups?: boolean | undefined
  autosize?: boolean | undefined
  blinkfeatures?: string | undefined
  disableblinkfeatures?: string | undefined
  disableguestresize?: boolean | undefined
  disablewebsecurity?: boolean | undefined
  guestinstance?: string | undefined
  httpreferrer?: string | undefined
  nodeintegration?: boolean | undefined
  partition?: string | undefined
  plugins?: boolean | undefined
  preload?: string | undefined
  src?: string | undefined
  useragent?: string | undefined
  webpreferences?: string | undefined
}

/**
 * Subset of HTML elements that Satori supports.
 *
 * @todo remove unsupported elements.
 */
export interface DefinedIntrinsicElements {
  // HTML
  a: DetailedHTMLProps<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    HTMLAnchorElement
  >
  abbr: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  address: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  area: DetailedHTMLProps<AreaHTMLAttributes<HTMLAreaElement>, HTMLAreaElement>
  article: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  aside: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  audio: DetailedHTMLProps<
    AudioHTMLAttributes<HTMLAudioElement>,
    HTMLAudioElement
  >
  b: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  base: DetailedHTMLProps<BaseHTMLAttributes<HTMLBaseElement>, HTMLBaseElement>
  bdi: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  bdo: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  big: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  blockquote: DetailedHTMLProps<
    BlockquoteHTMLAttributes<HTMLQuoteElement>,
    HTMLQuoteElement
  >
  body: DetailedHTMLProps<HTMLAttributes<HTMLBodyElement>, HTMLBodyElement>
  br: DetailedHTMLProps<HTMLAttributes<HTMLBRElement>, HTMLBRElement>
  button: DetailedHTMLProps<
    ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
  >
  canvas: DetailedHTMLProps<
    CanvasHTMLAttributes<HTMLCanvasElement>,
    HTMLCanvasElement
  >
  caption: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  center: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  cite: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  code: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  col: DetailedHTMLProps<
    ColHTMLAttributes<HTMLTableColElement>,
    HTMLTableColElement
  >
  colgroup: DetailedHTMLProps<
    ColgroupHTMLAttributes<HTMLTableColElement>,
    HTMLTableColElement
  >
  data: DetailedHTMLProps<DataHTMLAttributes<HTMLDataElement>, HTMLDataElement>
  datalist: DetailedHTMLProps<
    HTMLAttributes<HTMLDataListElement>,
    HTMLDataListElement
  >
  dd: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  del: DetailedHTMLProps<DelHTMLAttributes<HTMLModElement>, HTMLModElement>
  details: DetailedHTMLProps<
    DetailsHTMLAttributes<HTMLDetailsElement>,
    HTMLDetailsElement
  >
  dfn: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  dialog: DetailedHTMLProps<
    DialogHTMLAttributes<HTMLDialogElement>,
    HTMLDialogElement
  >
  div: DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>
  dl: DetailedHTMLProps<HTMLAttributes<HTMLDListElement>, HTMLDListElement>
  dt: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  em: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  embed: DetailedHTMLProps<
    EmbedHTMLAttributes<HTMLEmbedElement>,
    HTMLEmbedElement
  >
  fieldset: DetailedHTMLProps<
    FieldsetHTMLAttributes<HTMLFieldSetElement>,
    HTMLFieldSetElement
  >
  figcaption: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  figure: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  footer: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  form: DetailedHTMLProps<FormHTMLAttributes<HTMLFormElement>, HTMLFormElement>
  h1: DetailedHTMLProps<HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>
  h2: DetailedHTMLProps<HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>
  h3: DetailedHTMLProps<HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>
  h4: DetailedHTMLProps<HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>
  h5: DetailedHTMLProps<HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>
  h6: DetailedHTMLProps<HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>
  head: DetailedHTMLProps<HTMLAttributes<HTMLHeadElement>, HTMLHeadElement>
  header: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  hgroup: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  hr: DetailedHTMLProps<HTMLAttributes<HTMLHRElement>, HTMLHRElement>
  html: DetailedHTMLProps<HtmlHTMLAttributes<HTMLHtmlElement>, HTMLHtmlElement>
  i: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  iframe: DetailedHTMLProps<
    IframeHTMLAttributes<HTMLIFrameElement>,
    HTMLIFrameElement
  >
  img: DetailedHTMLProps<ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>
  input: DetailedHTMLProps<
    InputHTMLAttributes<HTMLInputElement>,
    HTMLInputElement
  >
  ins: DetailedHTMLProps<InsHTMLAttributes<HTMLModElement>, HTMLModElement>
  kbd: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  keygen: DetailedHTMLProps<KeygenHTMLAttributes<HTMLElement>, HTMLElement>
  label: DetailedHTMLProps<
    LabelHTMLAttributes<HTMLLabelElement>,
    HTMLLabelElement
  >
  legend: DetailedHTMLProps<
    HTMLAttributes<HTMLLegendElement>,
    HTMLLegendElement
  >
  li: DetailedHTMLProps<LiHTMLAttributes<HTMLLIElement>, HTMLLIElement>
  link: DetailedHTMLProps<LinkHTMLAttributes<HTMLLinkElement>, HTMLLinkElement>
  main: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  map: DetailedHTMLProps<MapHTMLAttributes<HTMLMapElement>, HTMLMapElement>
  mark: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  menu: DetailedHTMLProps<MenuHTMLAttributes<HTMLElement>, HTMLElement>
  menuitem: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  meta: DetailedHTMLProps<MetaHTMLAttributes<HTMLMetaElement>, HTMLMetaElement>
  meter: DetailedHTMLProps<
    MeterHTMLAttributes<HTMLMeterElement>,
    HTMLMeterElement
  >
  nav: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  noindex: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  noscript: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  object: DetailedHTMLProps<
    ObjectHTMLAttributes<HTMLObjectElement>,
    HTMLObjectElement
  >
  ol: DetailedHTMLProps<OlHTMLAttributes<HTMLOListElement>, HTMLOListElement>
  optgroup: DetailedHTMLProps<
    OptgroupHTMLAttributes<HTMLOptGroupElement>,
    HTMLOptGroupElement
  >
  option: DetailedHTMLProps<
    OptionHTMLAttributes<HTMLOptionElement>,
    HTMLOptionElement
  >
  output: DetailedHTMLProps<
    OutputHTMLAttributes<HTMLOutputElement>,
    HTMLOutputElement
  >
  p: DetailedHTMLProps<
    HTMLAttributes<HTMLParagraphElement>,
    HTMLParagraphElement
  >
  param: DetailedHTMLProps<
    ParamHTMLAttributes<HTMLParamElement>,
    HTMLParamElement
  >
  picture: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  pre: DetailedHTMLProps<HTMLAttributes<HTMLPreElement>, HTMLPreElement>
  progress: DetailedHTMLProps<
    ProgressHTMLAttributes<HTMLProgressElement>,
    HTMLProgressElement
  >
  q: DetailedHTMLProps<QuoteHTMLAttributes<HTMLQuoteElement>, HTMLQuoteElement>
  rp: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  rt: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  ruby: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  s: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  samp: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  search: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  slot: DetailedHTMLProps<SlotHTMLAttributes<HTMLSlotElement>, HTMLSlotElement>
  script: DetailedHTMLProps<
    ScriptHTMLAttributes<HTMLScriptElement>,
    HTMLScriptElement
  >
  section: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  select: DetailedHTMLProps<
    SelectHTMLAttributes<HTMLSelectElement>,
    HTMLSelectElement
  >
  small: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  source: DetailedHTMLProps<
    SourceHTMLAttributes<HTMLSourceElement>,
    HTMLSourceElement
  >
  span: DetailedHTMLProps<HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>
  strong: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  style: DetailedHTMLProps<
    StyleHTMLAttributes<HTMLStyleElement>,
    HTMLStyleElement
  >
  sub: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  summary: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  sup: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  table: DetailedHTMLProps<
    TableHTMLAttributes<HTMLTableElement>,
    HTMLTableElement
  >
  template: DetailedHTMLProps<
    HTMLAttributes<HTMLTemplateElement>,
    HTMLTemplateElement
  >
  tbody: DetailedHTMLProps<
    HTMLAttributes<HTMLTableSectionElement>,
    HTMLTableSectionElement
  >
  td: DetailedHTMLProps<
    TdHTMLAttributes<HTMLTableDataCellElement>,
    HTMLTableDataCellElement
  >
  textarea: DetailedHTMLProps<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    HTMLTextAreaElement
  >
  tfoot: DetailedHTMLProps<
    HTMLAttributes<HTMLTableSectionElement>,
    HTMLTableSectionElement
  >
  th: DetailedHTMLProps<
    ThHTMLAttributes<HTMLTableHeaderCellElement>,
    HTMLTableHeaderCellElement
  >
  thead: DetailedHTMLProps<
    HTMLAttributes<HTMLTableSectionElement>,
    HTMLTableSectionElement
  >
  time: DetailedHTMLProps<TimeHTMLAttributes<HTMLTimeElement>, HTMLTimeElement>
  title: DetailedHTMLProps<HTMLAttributes<HTMLTitleElement>, HTMLTitleElement>
  tr: DetailedHTMLProps<
    HTMLAttributes<HTMLTableRowElement>,
    HTMLTableRowElement
  >
  track: DetailedHTMLProps<
    TrackHTMLAttributes<HTMLTrackElement>,
    HTMLTrackElement
  >
  u: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  ul: DetailedHTMLProps<HTMLAttributes<HTMLUListElement>, HTMLUListElement>
  var: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  video: DetailedHTMLProps<
    VideoHTMLAttributes<HTMLVideoElement>,
    HTMLVideoElement
  >
  wbr: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  webview: DetailedHTMLProps<
    WebViewHTMLAttributes<HTMLWebViewElement>,
    HTMLWebViewElement
  >

  // SVG
  svg: SVGProps<SVGSVGElement>

  animate: SVGProps<SVGElement> // TODO: It is SVGAnimateElement but is not in TypeScript's lib.dom.d.ts for now.
  animateMotion: SVGProps<SVGElement>
  animateTransform: SVGProps<SVGElement> // TODO: It is SVGAnimateTransformElement but is not in TypeScript's lib.dom.d.ts for now.
  circle: SVGProps<SVGCircleElement>
  clipPath: SVGProps<SVGClipPathElement>
  defs: SVGProps<SVGDefsElement>
  desc: SVGProps<SVGDescElement>
  ellipse: SVGProps<SVGEllipseElement>
  feBlend: SVGProps<SVGFEBlendElement>
  feColorMatrix: SVGProps<SVGFEColorMatrixElement>
  feComponentTransfer: SVGProps<SVGFEComponentTransferElement>
  feComposite: SVGProps<SVGFECompositeElement>
  feConvolveMatrix: SVGProps<SVGFEConvolveMatrixElement>
  feDiffuseLighting: SVGProps<SVGFEDiffuseLightingElement>
  feDisplacementMap: SVGProps<SVGFEDisplacementMapElement>
  feDistantLight: SVGProps<SVGFEDistantLightElement>
  feDropShadow: SVGProps<SVGFEDropShadowElement>
  feFlood: SVGProps<SVGFEFloodElement>
  feFuncA: SVGProps<SVGFEFuncAElement>
  feFuncB: SVGProps<SVGFEFuncBElement>
  feFuncG: SVGProps<SVGFEFuncGElement>
  feFuncR: SVGProps<SVGFEFuncRElement>
  feGaussianBlur: SVGProps<SVGFEGaussianBlurElement>
  feImage: SVGProps<SVGFEImageElement>
  feMerge: SVGProps<SVGFEMergeElement>
  feMergeNode: SVGProps<SVGFEMergeNodeElement>
  feMorphology: SVGProps<SVGFEMorphologyElement>
  feOffset: SVGProps<SVGFEOffsetElement>
  fePointLight: SVGProps<SVGFEPointLightElement>
  feSpecularLighting: SVGProps<SVGFESpecularLightingElement>
  feSpotLight: SVGProps<SVGFESpotLightElement>
  feTile: SVGProps<SVGFETileElement>
  feTurbulence: SVGProps<SVGFETurbulenceElement>
  filter: SVGProps<SVGFilterElement>
  foreignObject: SVGProps<SVGForeignObjectElement>
  g: SVGProps<SVGGElement>
  image: SVGProps<SVGImageElement>
  line: SVGLineElementAttributes<SVGLineElement>
  linearGradient: SVGProps<SVGLinearGradientElement>
  marker: SVGProps<SVGMarkerElement>
  mask: SVGProps<SVGMaskElement>
  metadata: SVGProps<SVGMetadataElement>
  mpath: SVGProps<SVGElement>
  path: SVGProps<SVGPathElement>
  pattern: SVGProps<SVGPatternElement>
  polygon: SVGProps<SVGPolygonElement>
  polyline: SVGProps<SVGPolylineElement>
  radialGradient: SVGProps<SVGRadialGradientElement>
  rect: SVGProps<SVGRectElement>
  set: SVGProps<SVGSetElement>
  stop: SVGProps<SVGStopElement>
  switch: SVGProps<SVGSwitchElement>
  symbol: SVGProps<SVGSymbolElement>
  text: SVGTextElementAttributes<SVGTextElement>
  textPath: SVGProps<SVGTextPathElement>
  tspan: SVGProps<SVGTSpanElement>
  use: SVGProps<SVGUseElement>
  view: SVGProps<SVGViewElement>
}
