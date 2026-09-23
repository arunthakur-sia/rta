import { StateGraph, MemorySaver, START, END } from "@langchain/langgraph";
import { PitchValidationState } from "./state";
import {
  closedNode,
  coherenceNode,
  contentNode,
  mockJuryNode,
  parseCheckNode,
  readinessNode,
  routeAfterMockJury,
  structureNode,
  uploadNode,
} from "./nodes";

// upload -> parse_check -> structure -> content -> coherence -> mock_jury -> readiness -> closed
// The readiness verdict is final automatically — there is no separate
// coach account to confirm Demo Day readiness.
// "mock_jury" is a self-loop — one turn per visit, see mockJuryNode's comment.
const builder = new StateGraph(PitchValidationState)
  .addNode("upload", uploadNode)
  .addNode("parse_check", parseCheckNode)
  .addNode("structure", structureNode)
  .addNode("content", contentNode)
  .addNode("coherence", coherenceNode)
  .addNode("mock_jury", mockJuryNode)
  .addNode("readiness", readinessNode)
  .addNode("closed", closedNode)
  .addEdge(START, "upload")
  .addEdge("upload", "parse_check")
  .addEdge("parse_check", "structure")
  .addEdge("structure", "content")
  .addEdge("content", "coherence")
  .addEdge("coherence", "mock_jury")
  .addConditionalEdges("mock_jury", routeAfterMockJury, ["mock_jury", "readiness"])
  .addEdge("readiness", "closed")
  .addEdge("closed", END);

const checkpointer = new MemorySaver();

export const pitchValidationGraph = builder.compile({ checkpointer });
