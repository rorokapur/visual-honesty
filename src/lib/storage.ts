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
  isDeceptive: 1 | 0,
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

  const { error: dbError } = await supabase.from("stimuli").insert({
    image_id: uuid,
    set_id: setName,
    image_url: publicUrl,
    is_deceptive: isDeceptive,
  });

  if (dbError) throw dbError;
}

/**
 * Removes a specified image from the backend (db + storage)
 * @param image_id - uuid of image to delete
 */
export async function deleteStimulus(image_id: string) {
  const supabase = getSupabaseAdmin();

  // Get the image_url for this image_id
  const { data: stimulus, error: selectError } = await supabase
    .from("stimuli")
    .select("image_url")
    .eq("image_id", image_id)
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
    .eq("image_id", image_id);

  if (dbError) throw dbError;
}
