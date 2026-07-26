PDFMINT v2.5.5 — INTUITIVE SIGNATURE INTERACTION

FIXED
Previously, pressing on a signature immediately started the drag behaviour.
This made the signature continue feeling like a floating/moveable object and
made it difficult to reach the resize handles.

NEW BEHAVIOUR
- A single click or tap selects and anchors the signature.
- The blue bounding box and resize handles remain available.
- The signature moves only when the pointer/finger travels more than 5 pixels.
- A normal click no longer triggers a drag.
- Users can immediately press any blue handle after selecting.
- Clicking outside still removes the blue bounding box.
- Dragging and resizing update the existing element directly instead of
  rebuilding it during every movement.

This works with mouse, touch and stylus input.
