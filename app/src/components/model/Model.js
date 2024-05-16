import { Box, Paper } from "@mui/material";
import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useParams } from "react-router-dom";
import { modelActions } from "../../actions/model.action";
import { loadModel } from "../../actions/model/loadModel";
import {
  useGetModelPermissionsQuery,
  useGetModelQuery,
} from "../../api/gram/model";
import { useModelSync } from "../../hooks/useModelSync";
import { useOpenModal } from "../../hooks/useOpenModal";
import { webSocketActions } from "../../redux/webSocketSlice";
import { ErrorPage } from "../elements/ErrorPage";
import { LoadingPage } from "../elements/loading/loading-page/LoadingPage";
import { MODALS } from "../elements/modal/ModalManager";
import "./Model.css";
import Board from "./board/Board";
import ConnectivityCheck from "./connectivity/ConnectivityCheck";
import { PERMISSIONS } from "./constants";
import { LeftPanel } from "./panels/left/LeftPanel";
import { RightPanel } from "./panels/right/RightPanel";
import { useIsFramed } from "../../hooks/useIsFramed";

export function Model() {
  const dispatch = useDispatch();
  const isFramed = useIsFramed();

  const { id } = useParams("/model/:id");
  const { data: model, isError, error } = useGetModelQuery(id);

  useEffect(() => {
    model && dispatch(loadModel(model));
  }, [dispatch, model]);

  const openModal = useOpenModal();

  // clear the model state from redux on component unload
  useEffect(() => {
    return () => {
      dispatch(modelActions.clearReduxState());
    };
  }, [dispatch]);

  const { data: permissions } = useGetModelPermissionsQuery({ modelId: id });
  const readAllowed = permissions?.includes(PERMISSIONS.READ);
  const writeAllowed = !isFramed && permissions?.includes(PERMISSIONS.WRITE);

  // create a WS client and close when component is unloaded
  useEffect(() => {
    if (id && readAllowed) {
      dispatch(webSocketActions.establishConnection(id));
      return () => dispatch(webSocketActions.disconnect());
    }
  }, [id, readAllowed, dispatch]);

  useEffect(() => {
    if (writeAllowed) {
      model?.shouldReviewActionItems &&
        openModal(MODALS.RevisitActionItems.name);
    }
  }, [model, writeAllowed, openModal]);

  // if write permission sync model changes (patch component) to the backend
  useModelSync();

  if (isError) {
    return <ErrorPage code={error.originalStatus} />;
  }

  if (model?.id !== id) return <LoadingPage isLoading={true} />;

  if (!readAllowed) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
        }}
      >
        <Paper
          sx={{
            width: "350px",
            height: "100px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Box sx={{ padding: "20px" }}>
            You don't have permission to view this threat model.
          </Box>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", height: "100%", backgroundColor: "#fff" }}>
      <ConnectivityCheck modelId={id} />
      {!isFramed && <LeftPanel />}
      <Board />
      {!isFramed && <RightPanel />}
    </Box>
  );
}
