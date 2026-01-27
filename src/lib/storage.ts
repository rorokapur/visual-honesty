import { getSupabaseAdmin } from "./supabase";

/**
 * Add an image to a stimuli set in the backend
 * @param file - image file to upload
 * @param setName - stimuli set name to add to
 * @param isDeceptive - whether or not the image is deceptive
 */
export async function uploadStimulus(
  file: File,
  setName: string,
  isDeceptive: boolean,
  name?: string,
) {
  const supabase = getSupabaseAdmin();
  const fileExt = file.name.split(".").pop();
  const uuid = window.crypto.randomUUID();
  const fileName = `${uuid}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("stimuli")
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from("stimuli").getPublicUrl(fileName);

  const { error } = await supabase.rpc("add_stimulus", {
    p_image_url: publicUrl,
    p_name: name ? name : file.name.split(".")[0],
    p_is_deceptive: isDeceptive,
    p_set_name: setName,
  });

  if (error) throw error;
}

/**
 * Removes a specified image from the backend (db + storage)
 * @param image_id - uuid of image to delete
 */
export async function deleteStimulus(id: string) {
  const supabase = getSupabaseAdmin();

  // Get the image_url for this image_id
  const { data: stimulus, error: selectError } = await supabase
    .from("stimuli")
    .select("image_url")
    .eq("id", id)
    .single();

  if (selectError) throw selectError;

  // Extract the file name from the URL
  const url = new URL(stimulus.image_url);
  const fileName = url.pathname.split("/").pop();

  if (!fileName) throw new Error("Could not extract file name from URL");

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from("stimuli")
    .remove([fileName]);

  if (storageError) throw storageError;

  // Delete database entry
  const { error: dbError } = await supabase
    .from("stimuli")
    .delete()
    .eq("id", id);

  if (dbError) throw dbError;
}
